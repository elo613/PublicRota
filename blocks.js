document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#schedule-table tbody");
    const blockSelect = document.getElementById("block-select");

    let authToken = ""; // Store the JWT token globally

    // Check token validity
    function checkLogin() {
        const tokenString = localStorage.getItem("loginToken");
        if (!tokenString) {
            redirectToLogin();
            return false;
        }

        try {
            const token = JSON.parse(tokenString);
            if (Date.now() > token.expiry) {
                alert("Session expired. Please log in again.");
                localStorage.removeItem("loginToken");
                redirectToLogin();
                return false;
            }
            authToken = token.value; // Set the global authToken
            return true;
        } catch (e) {
            console.error("Error parsing token:", e);
            redirectToLogin();
            return false;
        }
    }

    // Redirect to the login page
    function redirectToLogin() {
        window.location.href = "index.html";
    }

    // Fetch blocks data securely
    async function fetchBlocksData() {
        try {
            // Use a relative path for fetching blocks.json from the same directory
            const response = await fetch("./blocks.json");
    
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error loading blocks.json:", error);
            alert("Failed to load block data. Please try again later.");
        }
    }


    // Update schedule table
    function updateScheduleTable(blockData) {
        tableBody.innerHTML = ""; // Clear previous rows

        for (const day in blockData) {
            const row = document.createElement("tr");

            // Day column
            const dayCell = document.createElement("td");
            dayCell.textContent = day;
            row.appendChild(dayCell);

            // AM Session column
            const amCell = document.createElement("td");
            amCell.textContent = blockData[day].AM.value;
            if (blockData[day].AM.aau_friendly) {
                amCell.textContent += " *";
            }
            row.appendChild(amCell);

            // PM Session column
            const pmCell = document.createElement("td");
            pmCell.textContent = blockData[day].PM.value;
            if (blockData[day].PM.aau_friendly) {
                pmCell.textContent += " *";
            }
            row.appendChild(pmCell);

            tableBody.appendChild(row);
        }
    }

    // Populate block dropdown and set up event listener
    function populateBlockDropdown(blockData) {
        for (const block in blockData) {
            const option = document.createElement("option");
            option.value = block;
            option.textContent = block;
            blockSelect.appendChild(option);
        }

        blockSelect.addEventListener("change", () => {
            const selectedBlock = blockSelect.value;
            updateScheduleTable(blockData[selectedBlock]);
        });
    }

    // Main initialisation
    async function initialise() {
        if (!checkLogin()) return;

        const data = await fetchBlocksData();
        if (data) {
            populateBlockDropdown(data);
        }
    }

    initialise();
});
