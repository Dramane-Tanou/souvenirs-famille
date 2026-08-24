/**
 * Convertit un fichier HEIC/HEIF (format par défaut des iPhone) en JPEG,
 * car la plupart des navigateurs ne peuvent pas afficher le HEIC nativement.
 *
 * Stratégie en deux temps :
 * 1. Tente un décodage natif du navigateur (fonctionne sur Safari, qui sait
 *    lire nativement le HEIC, y compris les variantes Portrait avec profondeur).
 * 2. Si indisponible, retombe sur la librairie heic2any (fonctionne sur Chrome/
 *    Firefox/Edge, mais pas sur toutes les variantes HEIC — notamment certaines
 *    photos Portrait avec données de profondeur).
 *
 * Si les deux échouent, une erreur explicite est levée plutôt que d'envoyer
 * un fichier que personne ne pourra afficher.
 */
const MAX_DIMENSION = 2400;
const RESIZE_JPEG_QUALITY = 0.85;

/**
 * Redimensionne côté client les photos trop grandes (typiquement 3000-4000px
 * en sortie directe d'un smartphone) avant l'envoi, pour réduire fortement
 * la bande passante utilisée à l'upload et à l'affichage sur le fil — sans
 * perte perceptible en grille ou à l'impression d'un livre photo (2400px
 * suffit largement pour un tirage A4 à 300 DPI). Les fichiers déjà plus
 * petits ne sont pas touchés (pas de recompression inutile).
 */
export async function resizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  if (Math.max(width, height) <= MAX_DIMENSION) {
    bitmap.close();
    return file;
  }

  const scale = MAX_DIMENSION / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", RESIZE_JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}

export async function normalizeImageFile(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (!isHeic) {
    return file;
  }

  // Tentative 1 : décodage natif du navigateur (Safari sait le faire).
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Contexte canvas indisponible.");
    ctx.drawImage(bitmap, 0, 0);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Échec de la conversion canvas."))),
        "image/jpeg",
        0.85
      );
    });

    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Le décodage natif n'est pas disponible sur ce navigateur, on tente heic2any.
  }

  // Tentative 2 : librairie heic2any.
  try {
    const heic2any = (await import("heic2any")).default;

    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });

    const blob = Array.isArray(converted) ? converted[0] : converted;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (conversionError) {
    console.warn("Conversion HEIC échouée (native + heic2any) :", conversionError);
    throw new Error(
      "Cette photo utilise un format HEIC (souvent le mode Portrait) que ton navigateur ne peut pas convertir automatiquement. " +
      "Essaie de la partager d'abord via l'app Photos de l'iPhone (Partager → Enregistrer sous → JPEG), ou change temporairement le réglage de l'iPhone dans Réglages > Appareil photo > Formats > \"Le plus compatible\"."
    );
  }
}