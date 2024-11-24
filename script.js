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
let lastDate = null;  // Latest date in JSON

// Precomputed SHA-256 hashes for username and password
const storedUsernameHash = "f56c68f42cb42511dd16882d80fb852b44126eb19210785ad23dd16ad2273032"; 
const storedPasswordHash = "a27fd1720a7c30a644351e9d80659326a48b6e2f421286dbee282d235a23f53c"; 

// Helper to hash a string using SHA-256
async function hashInput(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Verify login credentials
async function verifyLogin(username, password) {
    // Hash the username and password entered by the user
    const usernameHash = await hashInput(username.trim().toLowerCase());
    const passwordHash = await hashInput(password);

    // Compare the hashes
    return usernameHash === storedUsernameHash && passwordHash === storedPasswordHash;
}

// Format date to "Day, dd Month yyyy"
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// Parse a date string in "dd Month yyyy" format
function parseDateString(dateString) {
    const [day, month, year] = dateString.split(" ");
    return new Date(`${month} ${day}, ${year}`);
}

// Helper to get Monday of the current week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(date.setDate(diff));
}

// Enable or disable navigation buttons
function updateButtonStates() {
    const weekStart = getWeekStart(new Date(currentDate));

    // Disable "Previous" button if the current week is the earliest week
    prevWeekButton.disabled = weekStart <= firstDate;

    // Disable "Next" button if the current week is more than 2 weeks beyond the last week
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 14);
    nextWeekButton.disabled = nextWeekStart > lastDate;
}

// Render rota for the current week
function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

        const amShift = rotaData.find(item => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("AM"));
        const pmShift = rotaData.find(item => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("PM"));

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amShift ? amShift.Registrar : "N/A"}</td>
            <td>${pmShift ? pmShift.Registrar : "N/A"}</td>
        `;
        rotaTableBody.appendChild(row);
    }

    updateButtonStates(); // Update button states after rendering
}

// Load rota data
async function loadRotaData() {
    try {
        const response = await fetch("rota.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        rotaData = await response.json();
        firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 7); // Allow 2 weeks beyond the last date
        displayRota();
    } catch (error) {
        console.error("Error loading rota.json:", error);
    }
}

// Login form event listener
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page refresh

    // Get the username and password entered by the user
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Verify the login credentials
    const isValid = await verifyLogin(username, password);
    if (isValid) {
        // If login is successful, hide the login form and show the rota
        loginContainer.style.display = "none";
        rotaContainer.style.display = "block";
        loadRotaData();
    } else {
        // If login fails, display an error message
        loginError.textContent = "Invalid username or password";
    }
});

// Navigation buttons
prevWeekButton.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 7);
    displayRota();
});

nextWeekButton.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 7);
    displayRota();
});
