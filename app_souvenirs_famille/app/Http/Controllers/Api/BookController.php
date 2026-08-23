<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookMemory;
use App\Models\BookPage;
use App\Models\Family;
use App\Models\Memory;
use App\Support\BookLayouts;
use App\Support\BookThemes;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BookController extends Controller
{
    /**
     * Liste des livres d'une famille.
     */
    public function index(Family $family)
    {
        $this->authorizeFamilyMember($family);

        return response()->json(
            $family->books()->orderByDesc('period_start')->get()
        );
    }

    /**
     * Détail d'un livre avec ses pages et photos.
     */
    public function show(Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        $book->load([
            'pages.bookMemories.memory.user:id,name',
            'orders:id,book_id,format,payment_status,price_cents,currency',
        ]);

        return response()->json($book);
    }

    /**
     * Liste des designs de livre disponibles (page de garde/fin + mise en page).
     */
    public function themes()
    {
        return response()->json([
            'themes' => collect(BookThemes::all())->map(fn ($theme, $id) => [...$theme, 'id' => $id])->values(),
            'dedication_fonts' => collect(BookThemes::dedicationFonts())->map(fn ($font, $id) => [...$font, 'id' => $id])->values(),
        ]);
    }

    /**
     * Choisit (ou change) le design du livre. Verrouillé dès que le livre
     * n'est plus à l'état brouillon (validé, commandé, imprimé ou livré).
     */
    public function setTheme(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'Le design ne peut plus être modifié pour ce livre.'], 422);
        }

        $validated = $request->validate([
            'theme' => ['required', 'string', 'in:' . implode(',', BookThemes::ids())],
        ]);

        $book->update(['theme' => $validated['theme']]);

        return response()->json($book);
    }

    /**
     * Écrit (ou modifie) la dédicace affichée sur la couverture du livre,
     * avec un choix de style d'écriture. Verrouillé dès que le livre n'est
     * plus à l'état brouillon.
     */
    public function setDedication(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'La dédicace ne peut plus être modifiée pour ce livre.'], 422);
        }

        $validated = $request->validate([
            'dedication_message' => ['nullable', 'string', 'max:500'],
            'dedication_font' => ['nullable', 'string', 'in:' . implode(',', BookThemes::dedicationFontIds())],
        ]);

        $book->update([
            'dedication_message' => $validated['dedication_message'] ?: null,
            'dedication_font' => $validated['dedication_message'] ? ($validated['dedication_font'] ?? 'classic') : null,
        ]);

        return response()->json($book);
    }

    /**
     * Change le gabarit de mise en page d'une page précise du livre — parmi
     * les mises en page qui accueillent le même nombre de photos qu'elle
     * contient déjà, pour ne jamais casser la disposition. Verrouillé dès
     * que le livre n'est plus à l'état brouillon.
     */
    public function setPageLayout(Request $request, Family $family, Book $book, BookPage $page)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);
        abort_if($page->book_id !== $book->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'La mise en page ne peut plus être modifiée pour ce livre.'], 422);
        }

        $validated = $request->validate([
            'layout_type' => ['required', 'string', 'in:' . implode(',', BookLayouts::ids())],
        ]);

        $photoCount = $page->bookMemories()->count();

        if (! BookLayouts::isValidFor($validated['layout_type'], $photoCount)) {
            return response()->json([
                'message' => "Cette mise en page n'accueille pas le même nombre de photos que cette page ({$photoCount}).",
            ], 422);
        }

        $page->update(['layout_type' => $validated['layout_type']]);

        return response()->json($page);
    }

    /**
     * Ajuste le cadrage (point focal + zoom) d'une photo d'une page du livre
     * — les mêmes champs que MemoryController::update(), sur le même
     * souvenir (donc aussi répercuté dans le fil). Contrairement à
     * MemoryController::update(), ce n'est PAS réservé à l'auteur du
     * souvenir ou à un admin : le livre appartient à qui le compose, donc
     * n'importe quel membre de la famille en train de préparer un livre peut
     * y ajuster le cadrage de n'importe quelle photo qu'il contient.
     * Verrouillé dès que le livre n'est plus à l'état brouillon.
     */
    public function updatePhotoCrop(Request $request, Family $family, Book $book, BookPage $page, Memory $memory)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);
        abort_if($page->book_id !== $book->id, 404);
        abort_if(! $page->bookMemories()->where('memory_id', $memory->id)->exists(), 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'Le cadrage ne peut plus être modifié pour ce livre.'], 422);
        }

        $validated = $request->validate([
            'focal_x' => ['required', 'integer', 'min:0', 'max:100'],
            'focal_y' => ['required', 'integer', 'min:0', 'max:100'],
            'zoom' => ['required', 'numeric', 'min:1', 'max:3'],
        ]);

        $memory->update($validated);

        return response()->json($memory);
    }

    /**
     * Change le nombre de photos d'une page précise du livre. Les photos en
     * trop (ou en moins) sont répercutées sur les pages suivantes en cascade
     * (chaque page suivante essaie de garder son nombre de photos actuel ;
     * s'il reste des photos après la dernière page existante, de nouvelles
     * pages sont créées). Verrouillé dès que le livre n'est plus à l'état
     * brouillon.
     */
    public function resizePage(Request $request, Family $family, Book $book, BookPage $page)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);
        abort_if($page->book_id !== $book->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'Le nombre de photos par page ne peut plus être modifié pour ce livre.'], 422);
        }

        $validated = $request->validate([
            'photo_count' => ['required', 'integer', 'min:1', 'max:' . BookLayouts::maxPhotosPerPage()],
        ]);

        $book->load('pages.bookMemories');
        $pages = $book->pages->sortBy('page_number')->values();
        $pageIndex = $pages->search(fn (BookPage $p) => $p->id === $page->id);

        abort_if($pageIndex === false, 404);

        // Pages avant celle qu'on redimensionne : inchangées. Pages à partir
        // d'elle (elle incluse) : leurs photos sont mises à plat dans l'ordre,
        // puis reréparties en gardant l'ancien nombre de photos de chaque page
        // suivante, sauf la page redimensionnée qui reçoit le nouveau nombre demandé.
        $downstreamPages = $pages->slice($pageIndex)->values();
        $targetSizes = $downstreamPages->map(fn (BookPage $p) => $p->bookMemories->count())->values();
        $targetSizes[0] = $validated['photo_count'];

        $flattenedMemoryIds = $downstreamPages
            ->flatMap(fn (BookPage $p) => $p->bookMemories->sortBy('position')->pluck('memory_id'))
            ->values();

        DB::transaction(function () use ($book, $downstreamPages, $targetSizes, $flattenedMemoryIds) {
            $startPageNumber = $downstreamPages->first()->page_number;
            $defaultMax = BookLayouts::maxPhotosPerPage();

            BookPage::whereIn('id', $downstreamPages->pluck('id'))->delete();

            $remaining = $flattenedMemoryIds->values();
            $sizeQueue = $targetSizes->values();
            $pageNumber = $startPageNumber;

            while ($remaining->isNotEmpty()) {
                $size = $sizeQueue->isNotEmpty() ? $sizeQueue->shift() : $defaultMax;
                $size = min($size, $remaining->count());

                if ($size < 1) {
                    $size = min($defaultMax, $remaining->count());
                }

                $memoryIdsForPage = $remaining->splice(0, $size)->values();

                $newPage = BookPage::create([
                    'book_id' => $book->id,
                    'page_number' => $pageNumber,
                    'layout_type' => BookLayouts::randomFor($memoryIdsForPage->count()),
                ]);

                foreach ($memoryIdsForPage as $position => $memoryId) {
                    BookMemory::create([
                        'book_id' => $book->id,
                        'book_page_id' => $newPage->id,
                        'memory_id' => $memoryId,
                        'position' => $position,
                    ]);
                }

                $pageNumber++;
            }
        });

        $book->load([
            'pages.bookMemories.memory.user:id,name',
            'orders:id,book_id,format,payment_status,price_cents,currency',
        ]);

        return response()->json($book);
    }

    /**
     * Réorganise tout le livre avec des pages de taille variée (1 à 9 photos,
     * tirées au hasard page par page) mais en ne choisissant que des mises en
     * page à taille égale (App\Support\BookLayouts::equalSizeIds) — jamais de
     * gabarit "grande photo + petites" ni de bandeau étroit sur une seule
     * rangée, pour que chaque photo reste bien visible. Verrouillé dès que le
     * livre n'est plus à l'état brouillon.
     */
    public function relayoutRandomly(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'La mise en page ne peut plus être réorganisée pour ce livre.'], 422);
        }

        $book->load('pages.bookMemories');
        $pages = $book->pages->sortBy('page_number')->values();

        $memoryIds = $pages
            ->flatMap(fn (BookPage $p) => $p->bookMemories->sortBy('position')->pluck('memory_id'))
            ->values();

        DB::transaction(function () use ($book, $pages, $memoryIds) {
            BookPage::whereIn('id', $pages->pluck('id'))->delete();

            $remaining = $memoryIds->values();
            $validCounts = BookLayouts::equalSizeCounts();
            $pageNumber = 1;

            while ($remaining->isNotEmpty()) {
                $available = array_values(array_filter($validCounts, fn ($count) => $count <= $remaining->count()));
                $size = $available[array_rand($available)];

                $memoryIdsForPage = $remaining->splice(0, $size)->values();

                $newPage = BookPage::create([
                    'book_id' => $book->id,
                    'page_number' => $pageNumber,
                    'layout_type' => BookLayouts::randomEqualSizeFor($memoryIdsForPage->count()),
                ]);

                foreach ($memoryIdsForPage as $position => $memoryId) {
                    BookMemory::create([
                        'book_id' => $book->id,
                        'book_page_id' => $newPage->id,
                        'memory_id' => $memoryId,
                        'position' => $position,
                    ]);
                }

                $pageNumber++;
            }
        });

        $book->load([
            'pages.bookMemories.memory.user:id,name',
            'orders:id,book_id,format,payment_status,price_cents,currency',
        ]);

        return response()->json($book);
    }

    /**
     * Génère un PDF téléchargeable du livre (une page A4 par page du livre),
     * réservé aux livres avec un design choisi et un achat PDF payé.
     */
    public function exportPdf(Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        abort_if(! $book->theme, 422, "Choisis d'abord un design pour ton livre.");
        abort_if(
            ! $book->orders()->where('format', 'pdf')->where('payment_status', 'paid')->exists(),
            403,
            'Achète la version PDF pour la télécharger.'
        );

        $theme = BookThemes::get($book->theme);
        $dedicationFont = $book->dedication_message
            ? (BookThemes::dedicationFonts()[$book->dedication_font] ?? BookThemes::dedicationFonts()['classic'])
            : null;

        $coverImageDataUri = null;
        if (! empty($theme['cover_image'])) {
            $coverImagePath = public_path($theme['cover_image']);
            if (file_exists($coverImagePath)) {
                $coverImageDataUri = 'data:image/jpeg;base64,' . base64_encode(file_get_contents($coverImagePath));
            }
        }

        $book->load(['pages.bookMemories.memory.user:id,name']);

        $isLandscape = $book->orientation === 'landscape';
        $pageWidthPx = $isLandscape ? 1123 : 794;
        $pageHeightPx = $isLandscape ? 794 : 1123;
        $pageContentBudget = $pageHeightPx - 130;
        // .page a 16px de padding de chaque côté (voir book-pdf.blade.php).
        $pageContentWidthPx = $pageWidthPx - 32;

        $pages = $book->pages->sortBy('page_number')->map(function (BookPage $page) use ($pageContentWidthPx, $pageContentBudget) {
            $geometry = BookLayouts::cellGeometry($page->layout_type);
            $defaultRows = max(1, (int) ceil($page->bookMemories->count() / 2));

            $photos = $page->bookMemories->sortBy('position')->values()->map(function (BookMemory $bm, int $index) use ($geometry, $pageContentWidthPx, $pageContentBudget, $defaultRows) {
                $memory = $bm->memory;
                $absolutePath = Storage::disk('public')->path($memory->image_path);
                $cell = $geometry[$index] ?? ['w' => 0.5, 'spanRows' => 1, 'totalRows' => $defaultRows];

                $cellWidthPx = $cell['w'] * $pageContentWidthPx;
                $cellHeightPx = isset($cell['hFrac'])
                    ? max(80, (int) round($pageContentBudget * $cell['hFrac']) - 26)
                    : max(80, (int) round(($pageContentBudget / $cell['totalRows']) * $cell['spanRows']) - 26);
                $targetAspect = $cellWidthPx / max(1, $cellHeightPx);

                return [
                    'data_uri' => $this->cropToAspectAndEncode($absolutePath, $targetAspect, $memory->focal_x, $memory->focal_y, $memory->zoom),
                    'caption' => $memory->caption,
                    'date' => $memory->memory_date?->locale('fr')->translatedFormat('d F Y'),
                ];
            });

            return ['page_number' => $page->page_number, 'layout_type' => $page->layout_type, 'photos' => $photos];
        })->values();

        $pdf = Pdf::loadView('book-pdf', [
            'family' => $family,
            'book' => $book,
            'pages' => $pages,
            'theme' => $theme,
            'dedicationFont' => $dedicationFont,
            'coverImageDataUri' => $coverImageDataUri,
            // Dimensions exactes d'une page A4 à 96dpi (DPI par défaut de
            // dompdf) pour le calque de fond .cover-bg (position absolue,
            // voir book-pdf.blade.php), qui couvre la page entière sans
            // influencer la pagination de .cover/.back-cover eux-mêmes.
            'pageWidthPx' => $pageWidthPx,
            'pageHeightPx' => $pageHeightPx,
            'coverPaddingTopPx' => $isLandscape ? 260 : 420,
            // Hauteur totale disponible pour la grille de photos d'une page de
            // contenu, une fois retirés le padding de .page (16px haut+bas) et
            // la ligne "Page N" en dessous (~48px) — chaque mise en page
            // (resources/views/book-pdf.blade.php) répartit cette hauteur entre
            // ses rangées via le helper $full(), pour que les photos occupent
            // vraiment toute la page plutôt qu'une partie suivie d'un espace
            // blanc, quelle que soit l'orientation.
            'pageContentBudget' => $pageContentBudget,
        ])->setPaper('a4', $book->orientation);

        return $pdf->download($this->albumFilename($family->name));
    }

    /**
     * "Album photo Famille {nom}" — sans doubler "Famille" quand la famille a
     * déjà nommé son groupe "Famille X" (convention courante côté utilisateurs).
     */
    private function albumFilename(string $familyName): string
    {
        $trimmedName = preg_replace('/^famille\s+/i', '', trim($familyName));

        return "Album photo Famille {$trimmedName}.pdf";
    }

    /**
     * Recadre une photo autour de son point focal pour correspondre exactement
     * au ratio largeur/hauteur de la case qu'elle occupe dans la mise en page
     * de la page, puis la redimensionne/recompresse avant de l'intégrer en
     * base64 dans le PDF. Le recadrage doit se faire ici, en amont côté
     * serveur (GD) : dompdf n'applique pas object-fit/object-position en CSS
     * (vérifié empiriquement — l'image serait simplement étirée dans sa case
     * sans respecter le point focal). La recompression évite par ailleurs des
     * PDF de plusieurs dizaines de Mo pour un livre de quelques dizaines de
     * pages avec des photos de téléphone (plusieurs Mo pièce), qui échouaient
     * silencieusement au téléchargement.
     */
    private function cropToAspectAndEncode(
        string $absolutePath,
        float $targetAspect,
        int $focalX,
        int $focalY,
        float $zoom = 1.0,
        int $maxDimension = 1000,
        int $quality = 78
    ): ?string {
        if (! file_exists($absolutePath)) {
            return null;
        }

        $raw = file_get_contents($absolutePath);
        $image = @imagecreatefromstring($raw);

        if (! $image) {
            return 'data:image/' . pathinfo($absolutePath, PATHINFO_EXTENSION) . ';base64,' . base64_encode($raw);
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $sourceAspect = $width / $height;

        if ($sourceAspect > $targetAspect) {
            $baseCropHeight = $height;
            $baseCropWidth = (int) round($height * $targetAspect);
        } else {
            $baseCropWidth = $width;
            $baseCropHeight = (int) round($width / $targetAspect);
        }

        // zoom > 1 rogne une portion plus petite (même ratio), centrée sur le
        // point focal — même logique que le recadrage interactif côté web
        // (src/components/PhotoCropper.tsx), pour que l'aperçu corresponde au
        // rendu final du PDF.
        $zoom = max(1.0, $zoom);
        $cropWidth = max(1, min($width, (int) round($baseCropWidth / $zoom)));
        $cropHeight = max(1, min($height, (int) round($baseCropHeight / $zoom)));

        $focalPxX = ($focalX / 100) * $width;
        $focalPxY = ($focalY / 100) * $height;

        $srcX = (int) round(min(max(0, $focalPxX - $cropWidth / 2), $width - $cropWidth));
        $srcY = (int) round(min(max(0, $focalPxY - $cropHeight / 2), $height - $cropHeight));

        $cropped = imagecreatetruecolor($cropWidth, $cropHeight);
        imagecopy($cropped, $image, 0, 0, $srcX, $srcY, $cropWidth, $cropHeight);
        imagedestroy($image);

        $scale = min(1, $maxDimension / max($cropWidth, $cropHeight));
        if ($scale < 1) {
            $newWidth = (int) round($cropWidth * $scale);
            $newHeight = (int) round($cropHeight * $scale);
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $cropped, 0, 0, 0, 0, $newWidth, $newHeight, $cropWidth, $cropHeight);
            imagedestroy($cropped);
            $cropped = $resized;
        }

        ob_start();
        imagejpeg($cropped, null, $quality);
        $encoded = ob_get_clean();
        imagedestroy($cropped);

        return 'data:image/jpeg;base64,' . base64_encode($encoded);
    }

    private const PERIOD_MONTHS = [
    'monthly' => 1,
    'quarterly' => 3,
    'semiannual' => 6,
    'yearly' => 12,
];

/**
 * Génère manuellement le livre pour la période choisie (1, 3, 6 ou 12 mois),
 * se terminant au mois en cours (ou au mois demandé).
 */
public function store(Request $request, Family $family)
{
    $this->authorizeFamilyMember($family);

    $validated = $request->validate([
        'period_type' => ['nullable', 'string', 'in:monthly,quarterly,semiannual,yearly'],
        'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        'year' => ['nullable', 'integer', 'min:2020'],
        'orientation' => ['nullable', 'string', 'in:portrait,landscape'],
        'photos_per_page' => ['nullable', 'integer', 'min:1', 'max:' . BookLayouts::maxPhotosPerPage()],
    ]);

    $orientation = $validated['orientation'] ?? 'portrait';
    $photosPerPage = $validated['photos_per_page'] ?? null;
    $periodType = $validated['period_type'] ?? 'monthly';
    $monthsCount = self::PERIOD_MONTHS[$periodType];

    $endMonth = $validated['month'] ?? now()->month;
    $endYear = $validated['year'] ?? now()->year;

    $periodEnd = now()->setDate($endYear, $endMonth, 1)->endOfMonth();
    $periodStart = $periodEnd->copy()->subMonths($monthsCount - 1)->startOfMonth();

    if (Book::where('family_id', $family->id)
        ->where('period_start', $periodStart->toDateString())
        ->where('period_end', $periodEnd->toDateString())
        ->exists()) {
        return response()->json(['message' => 'Un livre existe déjà pour cette période.'], 409);
    }

    $memories = $family->memories()
        ->whereBetween('memory_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
        ->orderBy('memory_date')
        ->get();

    if ($memories->isEmpty()) {
        return response()->json(['message' => 'Aucun souvenir sur cette période, impossible de générer le livre.'], 422);
    }

    // Au-delà d'un mois, la période choisie doit être justifiée par de vrais
    // souvenirs remontant jusqu'au début de cette période — sinon "1 an" (par
    // exemple) réussirait silencieusement avec un seul mois de photos, ce qui
    // n'a pas de sens. On exige donc qu'un souvenir existe déjà à la date de
    // début de la période demandée (pas seulement quelque part dedans).
    if ($periodType !== 'monthly') {
        $oldestMemoryDate = $family->memories()->min('memory_date');

        if (! $oldestMemoryDate || \Illuminate\Support\Carbon::parse($oldestMemoryDate)->greaterThan($periodStart)) {
            $periodLabel = match ($periodType) {
                'quarterly' => '3 mois',
                'semiannual' => '6 mois',
                'yearly' => '1 an',
                default => $monthsCount . ' mois',
            };

            return response()->json([
                'message' => "Vos souvenirs ne remontent pas encore à {$periodLabel} en arrière — impossible de générer un livre sur cette période pour l'instant.",
            ], 422);
        }
    }

    $book = DB::transaction(function () use ($family, $periodType, $orientation, $periodStart, $periodEnd, $memories, $photosPerPage) {
        $book = Book::create([
            'family_id' => $family->id,
            'period_type' => $periodType,
            'orientation' => $orientation,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        $this->layoutBookRandomly($book, $memories, $photosPerPage);

        return $book;
    });

    $book->load(['pages.bookMemories.memory.user:id,name']);

    return response()->json($book, 201);
}

    /**
     * Répartit les photos sur des pages, en tirant au sort une mise en page
     * adaptée au nombre de photos par page parmi le catalogue
     * App\Support\BookLayouts, pour varier les gabarits d'une page à l'autre
     * plutôt que répéter toujours la même grille. $photosPerPage permet à la
     * famille d'imposer un nombre fixe de photos par page (sauf la dernière,
     * qui accueille le reste) ; sans valeur, chaque page est remplie au
     * maximum de photos possible (comportement historique).
     */
    private function layoutBookRandomly(Book $book, $memories, ?int $photosPerPage = null): void
    {
        $remaining = $memories->values();
        $pageNumber = 1;
        $maxSize = $photosPerPage ?? BookLayouts::maxPhotosPerPage();

        while ($remaining->isNotEmpty()) {
            $size = min($maxSize, $remaining->count());
            $photosForPage = $remaining->splice(0, $size);

            $page = BookPage::create([
                'book_id' => $book->id,
                'page_number' => $pageNumber,
                'layout_type' => BookLayouts::randomFor($size),
            ]);

            foreach ($photosForPage->values() as $position => $memory) {
                BookMemory::create([
                    'book_id' => $book->id,
                    'book_page_id' => $page->id,
                    'memory_id' => $memory->id,
                    'position' => $position,
                ]);
            }

            $pageNumber++;
        }
    }

    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }

/**
 * Supprime un livre tant qu'il est encore à l'état brouillon. Dès qu'il est
 * validé, il ne peut plus être supprimé — seule la commande (physique) reste
 * possible.
 */
public function destroy(Family $family, Book $book)
{
    $this->authorizeFamilyMember($family);
    abort_if($book->family_id !== $family->id, 404);

    if ($book->status !== 'draft') {
        return response()->json(['message' => "Impossible de supprimer un livre déjà validé — passe commande si tu veux le recevoir en version physique."], 422);
    }

    $book->delete(); // les pages et book_memory associés sont supprimés en cascade.

    return response()->json(['message' => 'Livre supprimé.']);
}

}