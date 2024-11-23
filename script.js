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

// Helper to get Monday of the current week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(date.setDate(diff));
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

// Enable or disable navigation buttons
function updateButtonStates() {
    const weekStart = getWeekStart(new Date(currentDate));

    prevWeekButton.disabled = weekStart <= firstDate;
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
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

    updateButtonStates();
}

// Load rota data
async function loadRotaData() {
    try {
        const response = await fetch("rota.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        rotaData = await response.json();
        firstDate = parseDateString(rotaData[0].Date);
        lastDate = parseDateString(rotaData[rotaData.length - 1].Date);
        displayRota();
    } catch (error) {
        console.error("Error loading rota.json:", error);
    }
}

// Verify login credentials
async function verifyLogin(username, password) {
    const storedUsername = "radiology";
    const storedPassword = "watford";
    // Normalise input username
    const normalisedUsername = username.trim().toLowerCase();
    return normalisedUsername === storedUsername && password === storedPassword;
}


// Function to show a message box with entered login information
function showMessageBox(username, password) {
    alert(`Entered Username: ${username}\nEntered Password: ${password}`);
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
