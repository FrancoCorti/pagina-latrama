import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passInput = document.getElementById("loginPassword");
const errorBox = document.getElementById("loginError");
const submitBtn = document.getElementById("loginSubmit");

onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("panel.html");
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Ingresando...";

    try {
        await signInWithEmailAndPassword(
            auth,
            emailInput.value.trim(),
            passInput.value
        );
        window.location.href = "panel.html";
    } catch (err) {
        errorBox.textContent = traducirError(err.code);
        submitBtn.disabled = false;
        submitBtn.textContent = "Ingresar";
    }
});

function traducirError(code) {
    switch (code) {
        case "auth/invalid-email":
            return "Email inválido.";
        case "auth/user-disabled":
            return "Este usuario está deshabilitado.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Credenciales incorrectas.";
        case "auth/too-many-requests":
            return "Demasiados intentos. Esperá unos minutos.";
        case "auth/network-request-failed":
            return "Problema de conexión. Revisá tu red.";
        default:
            return "No se pudo iniciar sesión. Intentalo de nuevo.";
    }
}
