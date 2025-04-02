// DOM Elements
const rotaTableBody = document.querySelector("#rota-table tbody");
const weekTitle = document.getElementById("week-title");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const loginForm = document.getElementById("login-form");
const loginContainer = document.getElementById("login-container");
const rotaContainer = document.getElementById("rota-container");
const loginError = document.getElementById("login-error");
const leaveTodayInput = document.getElementById("on-leave-today");

let currentDate = new Date(); // Default current date
let rotaData = [];
let firstDate = null; // Earliest date in JSON
let lastDate = null; // Latest date in JSON
let ultrasoundData = []; // Variable to store ultrasound data

// Global token for authenticated requests
let authToken = "";

// Toggle visibility of login or rota view
function toggleLoginView(isLoggedIn) {
    if (isLoggedIn) {
        loginContainer.style.display = "none";
        rotaContainer.style.display = "block";
        loadRotaData();  // Load rota data when logged in
        loadUltrasoundData();  // Load ultrasound data when logged in
    } else {
        loginContainer.style.display = "block";
        rotaContainer.style.display = "none";
    }
}

// Set token with expiry
function setToken(token) {
    const data = {
        value: token,
        expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem("loginToken", JSON.stringify(data));
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

    authToken = token.value; // Store the valid token globally
    return true;
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

// Function to display the rota
async function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = ""; // Clear existing rows

    // Loop through each day of the week (7 days)
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

        // Find the shift data for the current day
        const shiftData = rotaData.find(
            (item) => {
                const parsedDate = parseDateString(item.Date);
                return parsedDate.toDateString() === currentDay.toDateString();
            }
        );

        if (!shiftData) {
            continue; // Skip to the next day if no data is found for the current day
        }

        // Get AM and PM shift details
        const amDuty = shiftData.Shifts.AM ? shiftData.Shifts.AM.Duty : "-";
        const amReporting = shiftData.Shifts.AM ? shiftData.Shifts.AM.Reporting : "-";
        const pmDuty = shiftData.Shifts.PM ? shiftData.Shifts.PM.Duty : "-";
        const pmReporting = shiftData.Shifts.PM ? shiftData.Shifts.PM.Reporting : "-";

        // Get registrars on leave for the current day
        const registrarsOnLeave = await get_who_on_leave(currentDay);

        // Check ultrasound data for the current day
        const ultrasoundShift = ultrasoundData.find(
            (item) => parseDateString(item.Date).toDateString() === currentDay.toDateString()
        );

        // Prepare ultrasound duty value
        const ultrasoundDuty = ultrasoundShift ? `${ultrasoundShift.Session} - ${ultrasoundShift['Registrar name']}` : "-";

        const row = document.createElement("tr");

        // Reset any existing highlighting
        row.style.backgroundColor = ""; // Clear inline background

        // Apply highlighting for the current date
        if (currentDay.toDateString() === new Date().toDateString()) {
            row.style.backgroundColor = "lightblue"; // Highlight today's row
        }

        // Get the list of registrars on leave
        const onLeave = registrarsOnLeave.length > 0 ? registrarsOnLeave.join(", ") : "None";

        // Populate row with data in the order of AM Duty, AM Reporting, PM Duty, PM Reporting, and Ultrasound Duty
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amDuty}</td>
            <td>${amReporting}</td>
            <td>${pmDuty}</td>
            <td>${pmReporting}</td>
            <td>${ultrasoundDuty}</td> <!-- Added the Ultrasound Duty column -->
            <td>${onLeave}</td> <!-- Added the registrars on leave to the final column -->
        `;

        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Function to load rota data (existing function, make sure it's called)
async function loadRotaData() {
    try {
        const response = await fetch("./rota.json");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse and store rota data
        rotaData = await response.json();

        // Validate rota data
        if (!rotaData || !rotaData.length) {
            throw new Error("rota.json is empty or not formatted correctly.");
        }

        // Display the rota after loading rota data
        displayRota();
    } catch (error) {
        console.error("Error loading rota data:", error);
    }
}

// Function to load ultrasound data
async function loadUltrasoundData() {
    try {
        const response = await fetch("./ultrasound.json");
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the ultrasound data
        ultrasoundData = await response.json();

        // Validate ultrasound data
        if (!ultrasoundData || !ultrasoundData.length) {
            throw new Error("ultrasound.json is empty or not formatted correctly.");
        }

        // Display the rota after loading ultrasound data
        displayRota();
    } catch (error) {
        console.error("Error loading ultrasound data:", error);
    }
}

// Function to get the registrars on leave for a specific day
async function get_who_on_leave(currentDay) {
    const response = await fetch('registrars_data.json');
    const leaveData = await response.json();
    const registrarsOnLeave = [];

    leaveData.forEach((registrar) => {
        registrar.leave_records.forEach((leave) => {
            const leaveStartDate = new Date(leave.start);
            const leaveEndDate = new Date(leave.end);
            leaveEndDate.setHours(23, 59, 59, 999);

            if (currentDay >= leaveStartDate && currentDay <= leaveEndDate) {
                if (!registrarsOnLeave.includes(registrar.name)) {
                    registrarsOnLeave.push(registrar.name);
                }
            }
        });
    });

    return registrarsOnLeave;
}

// Initialise the page
document.addEventListener("DOMContentLoaded", () => {
    toggleLoginView(checkLogin());

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById("username").value.trim().toLowerCase();
            const passwordInput = document.getElementById("password").value;

            const usernameHash = "f56c68f42cb42511dd16882d80fb852b44126eb19210785ad23dd16ad2273032"; 
            const passwordHash = "a27fd1720a7c30a644351e9d80659326a48b6e2f421286dbee282d235a23f53c"; 

            async function hashValue(value) {
                const encoder = new TextEncoder();
                const data = encoder.encode(value);
                const hashBuffer = await crypto.subtle.digest("SHA-256", data);
                return Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");
            }

            try {
                const [hashedUsername, hashedPassword] = await Promise.all([ 
                    hashValue(usernameInput),
                    hashValue(passwordInput)
                ]);

                if (hashedUsername === usernameHash && hashedPassword === passwordHash) {
                    const token = "dummy-token";
                    setToken(token);
                    authToken = token;
                    toggleLoginView(true);
                } else {
                    loginError.textContent = "Invalid username or password";
                }
            } catch (error) {
                console.error("Login error:", error);
                loginError.textContent = "Error during login. Please try again.";
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
