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

// Global token for authenticated requests
let authToken = "";

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

// Display the rota for the current week
function displayRota() {
    const weekStart = getWeekStart(new Date(currentDate));
    weekTitle.textContent = `Week of: ${formatDate(weekStart)}`;
    rotaTableBody.innerHTML = ""; // Clear existing rows

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        const dayName = currentDay.toLocaleDateString("en-GB", { weekday: "long" });
        const dayDate = currentDay.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

        const amShift = rotaData.find(
            (item) => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("AM")
        );
        const pmShift = rotaData.find(
            (item) => parseDateString(item.Date).toDateString() === currentDay.toDateString() && item["Shift Type"].includes("PM")
        );

        const row = document.createElement("tr");

        // Reset any existing highlighting
        row.style.backgroundColor = ""; // Clear inline background

        // Apply highlighting for the current date
        if (currentDay.toDateString() === new Date().toDateString()) {
            row.style.backgroundColor = "lightblue"; // Highlight today's row
        }

        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amShift && amShift.Registrar ? amShift.Registrar : "-"}</td>
            <td>${pmShift && pmShift.Registrar ? pmShift.Registrar : "-"}</td>
        `;

        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Decrypt rota.json.enc with AES-256-CBC (Browser-compatible)
async function decryptRotaData(encryptedData, ivHex) {
    const key = new TextEncoder().encode(process.env.ENCRYPTION_KEY); // Use TextEncoder to encode the secret key
    const iv = new Uint8Array(16); // Initialization vector

    // Convert hex string to bytes for the IV
    for (let i = 0; i < ivHex.length; i += 2) {
        iv[i / 2] = parseInt(ivHex.slice(i, i + 2), 16);
    }

    const decoder = new TextDecoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    const encryptedBytes = new Uint8Array(encryptedData.match(/.{1,2}/g).map(byte => parseInt(byte, 16))); // Convert hex to bytes
    const decryptedBytes = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: iv },
        cryptoKey,
        encryptedBytes
    );

    return JSON.parse(decoder.decode(decryptedBytes));
}

async function loadRotaData() {
    try {
        // Fetch the encrypted rota.json.enc
        const response = await fetch("./rota.json.enc");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Get the encrypted data (Assumes the response contains the encrypted string in 'hex' format)
        const encryptedData = await response.text();

        // Extract the IV (assuming it is the first 16 bytes of the encrypted data)
        const ivHex = encryptedData.slice(0, 32); // First 16 bytes as the IV (in hex)

        // Decrypt the data
        const decryptedData = await decryptRotaData(encryptedData.slice(32), ivHex);

        // Assign decrypted data to rotaData
        rotaData = decryptedData;

        // Validate rotaData
        if (!rotaData || !rotaData.length) {
            throw new Error("rota.json is empty or not formatted correctly.");
        }

        // Process dates
        firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 14);

        // Display the rota
        displayRota();
    } catch (error) {
        console.error("Error loading rota.json:", error);
    }
}

async function loadLeaveData() {
    try {
        // Fetch the JSON file
        const response = await fetch("./registrars_data.json");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const registrarsData = await response.json();

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the start of today

        // Collect registrars who are on leave today
        const onLeave = [];

        // Loop through each registrar
        registrarsData.forEach((registrar) => {
            // Loop through each leave record of the registrar
            registrar.leave_records.forEach((leave) => {
                const leaveStart = new Date(leave.start);
                leaveStart.setHours(0, 0, 0, 0); // Start of the leave day

                const leaveEnd = new Date(leave.end);
                leaveEnd.setHours(23, 59, 59, 999); // End of the leave day

                let halfDay = ""
                if (leave.half_day == true) {
                    halfDay = "(0.5)"
                }

                // Check if today falls within the leave period
                if (leaveStart <= today && leaveEnd >= today) {
                    onLeave.push(registrar.name + halfDay);
                }
            });
        });

        // Populate the "On Leave Today" textbox
        leaveTodayInput.value = onLeave.length
            ? onLeave.join(", ")
            : "No one on leave today";
    } catch (error) {
        console.error("Error loading leave data:", error);
        leaveTodayInput.value = "Error loading data";
    }
}


// Add this to your initialization function
document.addEventListener("DOMContentLoaded", () => {
    loadLeaveData(); // Load leave data when the page loads
});

// Initialise the page
document.addEventListener("DOMContentLoaded", () => {
    toggleLoginView(checkLogin());

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // User input
        const usernameInput = document.getElementById("username").value.trim().toLowerCase();
        const passwordInput = document.getElementById("password").value;

        // Hardcoded SHA-256 hashes for username and password
        const usernameHash = "f56c68f42cb42511dd16882d80fb852b44126eb19210785ad23dd16ad2273032"; 
        const passwordHash = "a27fd1720a7c30a644351e9d80659326a48b6e2f421286dbee282d235a23f53c"; 

        // Function to hash input values using SHA-256
        async function hashValue(value) {
            const encoder = new TextEncoder();
            const data = encoder.encode(value);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        }

        try {
            // Hash the username and password inputs
            const [hashedUsername, hashedPassword] = await Promise.all([
                hashValue(usernameInput),
                hashValue(passwordInput)
            ]);

            // Validate hashed inputs against hardcoded hashes
            if (hashedUsername === usernameHash && hashedPassword === passwordHash) {
                const token = "dummy-token"; // Generate a dummy token (could be a random string in a real app)
                setToken(token); // Save the token
                authToken = token; // Set the global authToken
                toggleLoginView(true); // Load rota after token is set
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
