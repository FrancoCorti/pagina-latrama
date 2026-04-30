import { supabase } from "./supabase-config.js";

export async function cargarProfesionalesDesdeFirestore() {
    const { data, error } = await supabase
        .from("profesionales")
        .select("*, credenciales(id, nombre, tipo, url)")
        .eq("activo", true)
        .order("nombre");
    if (error) throw error;
    return data.map(row => ({ ...row, imgPath: row.img_path }));
}
