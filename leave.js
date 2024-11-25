// Import the dynamically injected token
import { GITHUB_TOKEN } from './token.js';

document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = "https://api.github.com/repos/elo613/radrota/contents/registrars_data.json";

    // Fetch the JSON data from the private repository
    fetch(apiUrl, {
        method: "GET",
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`, // Use the dynamically injected token
            Accept: "application/vnd.github.v3.raw"
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch registrar data");
            }
            return response.json();
        })
        .then(data => {
            console.log(data); // Process data
            populateDropdown(data);
        })
        .catch(error => console.error("Error fetching data:", error));

    function populateDropdown(data) {
        const registrarSelect = document.getElementById("registrar-select");
        data.forEach(registrar => {
            const option = document.createElement("option");
            option.value = registrar.name;
            option.textContent = registrar.name;
            registrarSelect.appendChild(option);
        });

        registrarSelect.addEventListener("change", () => {
            const selectedRegistrar = data.find(registrar => registrar.name === registrarSelect.value);
            if (selectedRegistrar) {
                showSections();
                displayRegistrarDetails(selectedRegistrar);
            } else {
                hideSections();
            }
        });
    }

    function displayRegistrarDetails(registrar) {
        const totalAnnualLeave = registrar.statutory_leave + registrar.carried_over_leave + registrar.days_off_in_lieu;
        document.getElementById("annual-leave-allowance").textContent = totalAnnualLeave || 0;
        document.getElementById("study-leave").textContent = registrar.study_leave || 0;

        const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
        leaveRecordsTable.innerHTML = "";
        let studyDays = 0, annualDays = 0, otherDays = 0;

        registrar.leave_records.forEach(record => {
            const row = document.createElement("tr");

            const startCell = document.createElement("td");
            startCell.textContent = record.start;
            row.appendChild(startCell);

            const endCell = document.createElement("td");
            endCell.textContent = record.end;
            row.appendChild(endCell);

            const typeCell = document.createElement("td");
            typeCell.textContent = record.type;
            row.appendChild(typeCell);

            const leaveDays = calculateWeekdaysBetween(record.start, record.end);
            if (record.type === "Study") studyDays += leaveDays;
            else if (record.type === "Annual") annualDays += leaveDays;
            else otherDays += leaveDays;

            leaveRecordsTable.appendChild(row);
        });

        document.getElementById("study-leave-used").textContent = studyDays || 0;
        document.getElementById("study-leave-remaining").textContent = registrar.study_leave - studyDays || 0;
        document.getElementById("annual-leave-used").textContent = annualDays || 0;
        document.getElementById("annual-leave-remaining").textContent = totalAnnualLeave - annualDays || 0;
        document.getElementById("other-leave-used").textContent = otherDays || 0;
        document.getElementById("other-leave-remaining").textContent = 0 - otherDays || 0;
    }

    function calculateWeekdaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
        }

        return count;
    }

    function hideSections() {
        document.getElementById("leave-details").classList.add("hidden");
        document.getElementById("leave-records").classList.add("hidden");
        document.getElementById("leave-summary").classList.add("hidden");
    }

    function showSections() {
        document.getElementById("leave-details").classList.remove("hidden");
        document.getElementById("leave-records").classList.remove("hidden");
        document.getElementById("leave-summary").classList.remove("hidden");
    }
});
