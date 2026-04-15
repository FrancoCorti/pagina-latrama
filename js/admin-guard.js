import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

export const authReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.replace("login.html");
            return;
        }
        document.body.dataset.authReady = "true";
        resolve(user);
    });
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.replace("login.html");
    });
}
