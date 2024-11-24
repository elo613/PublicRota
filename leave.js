document.addEventListener("DOMContentLoaded", () => {
    const registrarSelect = document.getElementById("registrar-select");
    const statutoryLeave = document.getElementById("statutory-leave");
    const carriedOverLeave = document.getElementById("carried-over-leave");
    const daysOffInLieu = document.getElementById("days-off-in-lieu");
    const studyLeave = document.getElementById("study-leave");
    const leaveRecordsTable = document.querySelector("#leave-records-table tbody");
    const studyLeaveUsed = document.getElementById("study-leave-used");
    const annualLeaveUsed = document.getElementById("annual-leave-used");
    const otherLeaveUsed = document.getElementById("other-leave-used");

    // Fetch the JSON data
    fetch('registrars_data.json')
        .then(response => response.json())
        .then(data => {
            // Populate the dropdown
            data.forEach(registrar => {
                const option = document.createElement("option");
                option.value = registrar.name;
                option.textContent = registrar.name;
                registrarSelect.appendChild(option);
            });

            // Event listener for registrar selection
            registrarSelect.addEventListener("change", () => {
                const selectedRegistrar = data.find(registrar => registrar.name === registrarSelect.value);
                if (selectedRegistrar) {
                    displayRegistrarDetails(selectedRegistrar);
                }
            });
        })
        .catch(error => console.error("Error loading data:", error));

    function displayRegistrarDetails(registrar) {
        // Update leave allowances
        statutoryLeave.textContent = registrar.statutory_leave;
        carriedOverLeave.textContent = registrar.carried_over_leave;
        daysOffInLieu.textContent = registrar.days_off_in_lieu;
        studyLeave.textContent = registrar.study_leave;

        // Update leave records
        leaveRecordsTable.innerHTML = "";
        let studyCount = 0, annualCount = 0, otherCount = 0;

        registrar.leave_records.forEach(record => {
            const row = document.createElement("tr");

            // Start Date
            const startCell = document.createElement("td");
            startCell.textContent = record.start;
            row.appendChild(startCell);

            // End Date
            const endCell = document.createElement("td");
            endCell.textContent = record.end;
            row.appendChild(endCell);

            // Leave Type
            const typeCell = document.createElement("td");
            typeCell.textContent = record.type;
            row.appendChild(typeCell);

            // Count leave types
            if (record.type === "Study") studyCount++;
            else if (record.type === "Annual") annualCount++;
            else otherCount++;

            leaveRecordsTable.appendChild(row);
        });

        // Update leave type summaries
        studyLeaveUsed.textContent = studyCount;
        annualLeaveUsed.textContent = annualCount;
        otherLeaveUsed.textContent = otherCount;
    }
});
