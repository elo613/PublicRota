// DOM Elements
const rotaTableBody = document.querySelector("#rota-table tbody");
const weekTitle = document.getElementById("week-title");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const loginForm = document.getElementById("login-form");
const loginContainer = document.getElementById("login-container");
const rotaContainer = document.getElementById("rota-container");
const loginError = document.getElementById("login-error");

let currentDate = new Date(); // Default current date
let rotaData = [];
let firstDate = null; // Earliest date in JSON
let lastDate = null; // Latest date in JSON

// Helper: Hash input using SHA-256
async function hashInput(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Verify login credentials
async function verifyLogin(username, password) {
    const storedUsernameHash = "f56c68f42cb42511dd16882d80fb852b44126eb19210785ad23dd16ad2273032";
    const storedPasswordHash = "a27fd1720a7c30a644351e9d80659326a48b6e2f421286dbee282d235a23f53c";

    const usernameHash = await hashInput(username.trim().toLowerCase());
    const passwordHash = await hashInput(password);

    return usernameHash === storedUsernameHash && passwordHash === storedPasswordHash;
}

// Set token with expiry
function setToken() {
    const token = {
        value: "userLoggedIn",
        expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem("loginToken", JSON.stringify(token));
}

// Check token validity
function checkLogin() {
    const tokenString = localStorage.getItem("loginToken");
    if (!tokenString) return false;

    const token = JSON.parse(tokenString);
    if (Date.now() > token.expiry) {
        localStorage.removeItem("loginToken");
        return false;
    }
    return true;
}

// Toggle visibility of login or rota view
function toggleLoginView(isLoggedIn) {
    if (isLoggedIn) {
        loginContainer.style.display = "none";
        rotaContainer.style.display = "block";
        loadRotaData();
    } else {
        loginContainer.style.display = "block";
        rotaContainer.style.display = "none";
    }
}

// Format date to "Day, dd Month yyyy"
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

// Parse a date string in "dd Month yyyy" format
function parseDateString(dateString) {
    const [day, month, year] = dateString.split(" ");
    return new Date(`${month} ${day}, ${year}`);
}

// Get the Monday of the current week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(date.setDate(diff));
}

// Update navigation button states
function updateButtonStates() {
    const weekStart = getWeekStart(new Date(currentDate));
    prevWeekButton.disabled = weekStart <= firstDate;
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 14);
    nextWeekButton.disabled = nextWeekStart > lastDate;
}

// Display the rota for the current week
function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

        const amShift = rotaData.find((item) =>
            parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("AM")
        );
        const pmShift = rotaData.find((item) =>
            parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("PM")
        );

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amShift ? amShift.Registrar : "N/A"}</td>
            <td>${pmShift ? pmShift.Registrar : "N/A"}</td>
        `;
        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Redirect to the blocks.html page
function openBlocksPage() {
    window.location.href = "blocks.html"; // Ensure blocks.html exists in the same directory
}

// Redirect to the leave.html page
function openLeave() {
    window.location.href = "leave.html"; // Ensure leave.html exists in the same directory
}

// Load rota data from API
async function loadRotaData() {
    const apiUrl = "https://us-central1-radrota.cloudfunctions.net/getRotaData";
    const rotaToken = process.env.ROTA_TOKEN; // Ensure ROTA_TOKEN is set in the environment

    try {
        if (!rotaToken) {
            throw new Error("ROTA_TOKEN is not defined in the environment");
        }

        const response = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${rotaToken}`
            }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        rotaData = await response.json();

        firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 14);

        displayRota();
    } catch (error) {
        console.error("Error loading rota data:", error);
    }
}

// Initialise the page
document.addEventListener("DOMContentLoaded", () => {
    toggleLoginView(checkLogin());

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            if (await verifyLogin(username, password)) {
                setToken();
                toggleLoginView(true);
            } else {
                loginError.textContent = "Invalid username or password";
            }
        });
    }

    prevWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - 7);
        displayRota();
    });

    nextWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + 7);
        displayRota();
    });
});
