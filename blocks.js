function checkLogin() {
    const tokenString = localStorage.getItem("loginToken");
    if (!tokenString) {
        redirectToLogin();
        return false;
    }

    const token = JSON.parse(tokenString);
    if (Date.now() > token.expiry) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("loginToken");
        redirectToLogin();
        return false;
    }
    return true;
}

function redirectToLogin() {
    window.location.href = "index.html";
}

// Blocks data loading
document.addEventListener("DOMContentLoaded", () => {
    if (!checkLogin()) return;

    fetch("blocks.json")
        .then((response) => response.json())
        .then((data) => {
            const blockSelect = document.getElementById("block-select");
            for (const block in data) {
                const option = document.createElement("option");
                option.value = block;
                option.textContent = block;
                blockSelect.appendChild(option);
            }
            blockSelect.addEventListener("change", () => {
                const selectedBlock = blockSelect.value;
                updateScheduleTable(data[selectedBlock]);
            });
        })
        .catch((error) => console.error("Error loading blocks.json:", error));
});

function updateScheduleTable(blockData) {
    const tableBody = document.querySelector("#schedule-table tbody");
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
