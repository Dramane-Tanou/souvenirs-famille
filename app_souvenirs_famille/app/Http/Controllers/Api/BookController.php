<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookMemory;
use App\Models\BookPage;
use App\Models\Family;
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
     * Choisit (ou change) le design du livre. Verrouillé une fois imprimé/livré.
     */
    public function setTheme(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if (in_array($book->status, ['printed', 'delivered'], true)) {
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
     * avec un choix de style d'écriture. Verrouillé une fois imprimé/livré.
     */
    public function setDedication(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if (in_array($book->status, ['printed', 'delivered'], true)) {
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
     * contient déjà, pour ne jamais casser la disposition. Verrouillé une
     * fois imprimé/livré.
     */
    public function setPageLayout(Request $request, Family $family, Book $book, BookPage $page)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);
        abort_if($page->book_id !== $book->id, 404);

        if (in_array($book->status, ['printed', 'delivered'], true)) {
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

        $pages = $book->pages->sortBy('page_number')->map(function (BookPage $page) {
            $photos = $page->bookMemories->sortBy('position')->map(function (BookMemory $bm) {
                $memory = $bm->memory;
                $absolutePath = Storage::disk('public')->path($memory->image_path);

                return [
                    'data_uri' => $this->resizeAndEncode($absolutePath),
                    'caption' => $memory->caption,
                    'date' => $memory->memory_date?->locale('fr')->translatedFormat('d F Y'),
                ];
            })->values();

            return ['page_number' => $page->page_number, 'layout_type' => $page->layout_type, 'photos' => $photos];
        })->values();

        $pdf = Pdf::loadView('book-pdf', [
            'family' => $family,
            'book' => $book,
            'pages' => $pages,
            'theme' => $theme,
            'dedicationFont' => $dedicationFont,
            'coverImageDataUri' => $coverImageDataUri,
        ])->setPaper('a4');

        return $pdf->download("livre-{$family->name}-{$book->period_start}.pdf");
    }

    /**
     * Redimensionne et recompresse une photo avant de l'intégrer en base64 dans
     * le PDF — sans ça, des photos de téléphone (plusieurs Mo pièce) produisent
     * des PDF de plusieurs dizaines de Mo pour un livre de quelques dizaines de
     * pages, qui échouent silencieusement au téléchargement (temps de génération
     * et taille de réponse excessifs).
     */
    private function resizeAndEncode(string $absolutePath, int $maxDimension = 1000, int $quality = 78): ?string
    {
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
        $scale = min(1, $maxDimension / max($width, $height));

        if ($scale < 1) {
            $newWidth = (int) round($width * $scale);
            $newHeight = (int) round($height * $scale);
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        ob_start();
        imagejpeg($image, null, $quality);
        $encoded = ob_get_clean();
        imagedestroy($image);

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
    ]);

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

    $book = DB::transaction(function () use ($family, $periodType, $periodStart, $periodEnd, $memories) {
        $book = Book::create([
            'family_id' => $family->id,
            'period_type' => $periodType,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        $this->layoutBookRandomly($book, $memories);

        return $book;
    });

    $book->load(['pages.bookMemories.memory.user:id,name']);

    return response()->json($book, 201);
}

    /**
     * Répartit les photos sur des pages (jusqu'à 6 photos par page), en
     * tirant au sort une mise en page adaptée au nombre de photos restantes
     * parmi le catalogue App\Support\BookLayouts, pour varier les gabarits
     * d'une page à l'autre plutôt que répéter toujours la même grille.
     */
    private function layoutBookRandomly(Book $book, $memories): void
    {
        $remaining = $memories->values();
        $pageNumber = 1;
        $maxSize = BookLayouts::maxPhotosPerPage();

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
 * Supprime un livre tant qu'il n'a pas été commandé (draft ou validated uniquement).
 */
public function destroy(Family $family, Book $book)
{
    $this->authorizeFamilyMember($family);
    abort_if($book->family_id !== $family->id, 404);

    if (! in_array($book->status, ['draft', 'validated'], true)) {
        return response()->json(['message' => 'Impossible de supprimer un livre déjà commandé.'], 422);
    }

    $book->delete(); // les pages et book_memory associés sont supprimés en cascade.

    return response()->json(['message' => 'Livre supprimé.']);
}

}