document.addEventListener("DOMContentLoaded", async () => {
    const registrarSelect = document.getElementById("registrars");
    const blockTable = document.getElementById("blockTable");
    const tbody = blockTable.querySelector("tbody");

    try {
        const response = await fetch("./reg_blocks.json");
        const data = await response.json();

        // Populate the dropdown list with registrar names
        Object.keys(data).forEach((registrar) => {
            const option = document.createElement("option");
            option.value = registrar;
            option.textContent = registrar;
            registrarSelect.appendChild(option);
        });

        registrarSelect.addEventListener("change", () => {
            const selectedRegistrar = registrarSelect.value;
            tbody.innerHTML = ""; // Clear the table

            if (selectedRegistrar) {
                const blocks = data[selectedRegistrar]?.Blocks || [];

                // Sort blocks chronologically by start year and start month
                blocks.sort((a, b) => {
                    const dateA = new Date(`${a.start_month} 1, ${a.start_year}`);
                    const dateB = new Date(`${b.start_month} 1, ${b.start_year}`);
                    return dateA - dateB;
                });

                blocks.forEach((block) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${block.start_month} / ${block.start_year}</td>
                        <td>${block.end_month} / ${block.end_year}</td>
                        <td>${block.block_name}</td>
                    `;
                    tbody.appendChild(row);
                });

                blockTable.style.display = "table";
            } else {
                blockTable.style.display = "none";
            }
        });
    } catch (error) {
        console.error("Error loading reg_blocks.json:", error);
    }
});
