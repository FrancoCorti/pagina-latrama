import { supabase } from "./supabase-config.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passInput = document.getElementById("loginPassword");
const errorBox = document.getElementById("loginError");
const submitBtn = document.getElementById("loginSubmit");

supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace("panel.html");
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Ingresando...";

    const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passInput.value
    });

    if (error) {
        errorBox.textContent = traducirError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Ingresar";
    } else {
        window.location.href = "panel.html";
    }
});

function traducirError(message) {
    if (message.includes("Invalid login credentials")) return "Credenciales incorrectas.";
    if (message.includes("Email not confirmed")) return "Email no confirmado. Revisá tu casilla.";
    if (message.includes("too many requests") || message.includes("rate limit")) return "Demasiados intentos. Esperá unos minutos.";
    if (message.includes("network") || message.includes("fetch")) return "Problema de conexión. Revisá tu red.";
    return "No se pudo iniciar sesión. Intentalo de nuevo.";
}
