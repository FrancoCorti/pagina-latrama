import { supabase } from "./supabase-config.js";

export const authReady = new Promise((resolve) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.replace("login.html");
            return;
        }
        document.body.dataset.authReady = "true";
        resolve(session.user);
    });
});

supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
        window.location.replace("login.html");
    }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.replace("login.html");
    });
}
