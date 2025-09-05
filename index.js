// DOM Elements
const rotaTableBody = document.querySelector("#rota-table tbody");
const weekTitle = document.getElementById("week-title");
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");

let currentDate = new Date(); // Default current date
let rotaData = [];
let firstDate = null; // Earliest date in JSON
let lastDate = null; // Latest date in JSON
let registrarsData = []; // Store registrars_data.json

// Format date to "Day, dd Month yyyy"
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

// Parse a date string in "dd/mm/yyyy" format
function parseDateString(dateString) {
    const [day, month, year] = dateString.split("/");
    return new Date(`${month}/${day}/${year}`);
}

// Get the Monday of the current week
function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const newDate = new Date(date.setDate(diff));
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

// Update navigation button states
function updateButtonStates() {
    const weekStart = getWeekStart(new Date(currentDate));
    prevWeekButton.disabled = weekStart <= firstDate;
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 14);
    nextWeekButton.disabled = nextWeekStart > lastDate;
}

// Handle array-based shifts
function getShiftRegistrars(shifts, session, role) {
    const registrars = shifts?.[session]?.[role];
    return registrars && registrars.length > 0 ? registrars.join(', ') : '-';
}

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
        const dateKey = formatDateForComparison(currentDay); // Format as "dd/mm/yyyy"

        // Find the rota data for the current day
        const rotaDayData = rotaData.find(item => item.Date === dateKey);
        const row = document.createElement("tr");

        // Apply highlighting for the current date
        if (currentDay.toDateString() === new Date().toDateString()) {
            row.style.backgroundColor = "lightblue";
        }

        let amDuty = '-', amReporting = '-', amUltrasound = '-';
        let pmDuty = '-', pmReporting = '-', pmUltrasound = '-';
        let onLeave = 'None';

        if (rotaDayData) {
            // Get registrars for each role and session
            amDuty = getShiftRegistrars(rotaDayData.Shifts, 'AM', 'Duty');
            amReporting = getShiftRegistrars(rotaDayData.Shifts, 'AM', 'Reporting');
            amUltrasound = getShiftRegistrars(rotaDayData.Shifts, 'AM', 'Ultrasound');
            pmDuty = getShiftRegistrars(rotaDayData.Shifts, 'PM', 'Duty');
            pmReporting = getShiftRegistrars(rotaDayData.Shifts, 'PM', 'Reporting');
            pmUltrasound = getShiftRegistrars(rotaDayData.Shifts, 'PM', 'Ultrasound');
        }

        // Get registrars on leave for the current day
        const registrarsOnLeave = get_who_on_leave(currentDay);
        if (registrarsOnLeave.length > 0) {
            onLeave = registrarsOnLeave.join(", ");
        }

        // Populate row with data
        row.innerHTML = `
            <td>${dayName} (${dayDate})</td>
            <td>${amDuty}</td>
            <td>${amReporting}</td>
            <td>${amUltrasound}</td>
            <td>${pmDuty}</td>
            <td>${pmReporting}</td>
            <td>${pmUltrasound}</td>
            <td>${onLeave}</td>
        `;
        rotaTableBody.appendChild(row);
    }
    updateButtonStates();
}

// Helper function to format date as "dd/mm/yyyy"
function formatDateForComparison(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Function to get registrars on leave for a specific day
function get_who_on_leave(currentDay) {
    const registrarsOnLeave = [];
    registrarsData.forEach((registrar) => {
        registrar.leave_records.forEach((leave) => {
            const [startDay, startMonth, startYear] = leave.start.split(' ');
            const [endDay, endMonth, endYear] = leave.end.split(' ');
            const leaveStartDate = new Date(`${startMonth} ${startDay}, ${startYear}`);
            const leaveEndDate = new Date(`${endMonth} ${endDay}, ${endYear}`);
            
            leaveStartDate.setHours(0, 0, 0, 0);
            leaveEndDate.setHours(23, 59, 59, 999);

            if (currentDay >= leaveStartDate && currentDay <= leaveEndDate) {
                registrarsOnLeave.push(registrar.name);
            }
        });
    });
    return registrarsOnLeave;
}

// Page redirection functions
function openBlocksPage() { window.location.href = "blocks.html"; }
function openRegLocation() { window.location.href = "where_at.html"; }
function openLeave() { window.location.href = "leave.html"; }
function openShowRegLocation() { window.location.href = "reg_location.html"; }
function openDaily() { window.location.href = "daily_view.html"; }
function openRegBlocks() { window.location.href = "reg_blocks.html"; }

async function loadRotaData() {
    try {
        const [rotaResponse, registrarsResponse] = await Promise.all([
            fetch("./rota.json"),
            fetch("./registrars_data.json")
        ]);

        if (!rotaResponse.ok || !registrarsResponse.ok) {
            throw new Error(`HTTP error! Status: ${rotaResponse.status} / ${registrarsResponse.status}`);
        }

        rotaData = await rotaResponse.json();
        registrarsData = await registrarsResponse.json();

        if (!rotaData || !rotaData.length) {
            throw new Error("rota.json is empty or not formatted correctly.");
        }

        firstDate = getWeekStart(parseDateString(rotaData[0].Date));
        lastDate = getWeekStart(parseDateString(rotaData[rotaData.length - 1].Date));
        lastDate.setDate(lastDate.getDate() + 14);

        displayRota();
    } catch (error) {
        console.error("Error loading rota.json or registrars_data.json:", error);
    }
}

// Initialise the page
document.addEventListener("DOMContentLoaded", () => {
    // Directly load the rota data.
    loadRotaData();

    prevWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - 7);
        displayRota();
    });

    nextWeekButton.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + 7);
        displayRota();
    });
});
