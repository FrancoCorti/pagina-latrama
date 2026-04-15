// Subida de imágenes a Cloudinary (plan gratuito, sin Firebase Storage).
// Requiere crear una cuenta en https://cloudinary.com y un "upload preset" unsigned:
// Settings -> Upload -> Upload presets -> Add upload preset -> Signing Mode: Unsigned.

const CLOUDINARY_CLOUD_NAME = "dfyuwqguk";
const CLOUDINARY_UPLOAD_PRESET = "tarotprofesionales_unsigned";

const MAX_BYTES = 2 * 1024 * 1024;

export function validarArchivoImagen(file) {
    if (!file) return "No se seleccionó ningún archivo.";
    if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
    if (file.size > MAX_BYTES) return "La imagen supera los 2 MB.";
    return null;
}

export async function subirImagenProfesional(docId, file) {
    if (CLOUDINARY_CLOUD_NAME.startsWith("REEMPLAZAR") || CLOUDINARY_UPLOAD_PRESET.startsWith("REEMPLAZAR")) {
        throw new Error("Configurá CLOUDINARY_CLOUD_NAME y CLOUDINARY_UPLOAD_PRESET en js/admin-storage.js");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    if (docId) formData.append("folder", `profesionales/${docId}`);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
    );

    if (!response.ok) {
        let detalle = `HTTP ${response.status}`;
        try {
            const err = await response.json();
            if (err?.error?.message) detalle = err.error.message;
        } catch (_) {}
        throw new Error(`Cloudinary rechazó la subida: ${detalle}`);
    }

    const data = await response.json();
    return { url: data.secure_url, path: data.public_id };
}

export async function borrarImagen(path) {
    // Cloudinary no permite borrar desde el cliente sin firma.
    // Las imágenes viejas quedan en la cuenta hasta limpiarlas desde el dashboard.
    if (!path) return;
    console.info("Imagen obsoleta en Cloudinary (limpiar manualmente si hace falta):", path);
}
