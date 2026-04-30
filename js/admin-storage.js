import { supabase } from "./supabase-config.js";

const BUCKET = "profesionales-imagenes";
const MAX_BYTES = 2 * 1024 * 1024;

export function validarArchivoImagen(file) {
    if (!file) return "No se seleccionó ningún archivo.";
    if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
    if (file.size > MAX_BYTES) return "La imagen supera los 2 MB.";
    return null;
}

export async function subirImagenProfesional(docId, file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const folder = docId || crypto.randomUUID();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: true
    });
    if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
}

export async function borrarImagen(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn("No se pudo borrar la imagen:", error.message);
}

// ---- Credenciales ----

const CRED_BUCKET = "profesionales-credenciales";
const MAX_CRED_BYTES = 5 * 1024 * 1024;

export function validarArchivoCredencial(file) {
    if (!file) return "No se seleccionó ningún archivo.";
    const esPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const esImagen = file.type.startsWith("image/");
    if (!esPdf && !esImagen) return "Solo se permiten imágenes o PDF.";
    if (file.size > MAX_CRED_BYTES) return "El archivo supera los 5 MB.";
    return null;
}

export async function subirCredencial(profesionalId, file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${profesionalId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(CRED_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false
    });
    if (error) throw new Error(`Error subiendo credencial: ${error.message}`);
    const { data } = supabase.storage.from(CRED_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
}

export async function borrarCredencialArchivo(path) {
    if (!path) return;
    const { error } = await supabase.storage.from(CRED_BUCKET).remove([path]);
    if (error) console.warn("No se pudo borrar la credencial:", error.message);
}

// Mantiene el nombre para compatibilidad con main.js.
// Transforma URLs de Supabase Storage a la API de render con resize.
export function optimizarUrlCloudinary(url, { width = 400, quality = "auto" } = {}) {
    if (!url) return url;
    if (url.includes(".supabase.co/storage/v1/object/public/")) {
        const q = typeof quality === "number" ? quality : 80;
        return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
            + `?width=${width}&height=${width}&resize=fill&quality=${q}`;
    }
    // Retrocompatibilidad con URLs de Cloudinary existentes
    if (url.includes("res.cloudinary.com")) {
        const fmt = "auto";
        return url.replace("/image/upload/", `/image/upload/f_${fmt},q_${quality},w_${width}/`);
    }
    return url;
}
