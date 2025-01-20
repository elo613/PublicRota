document.addEventListener("DOMContentLoaded", async () => {
    const dateInput = document.getElementById("date");
    const scheduleTable = document.getElementById("scheduleTable");
    const tbody = scheduleTable.querySelector("tbody");

    const fetchJSON = async (file) => {
        const response = await fetch(`./${file}`);
        return await response.json();
    };

    const files = {
        registrars: "registrars_data.json",
        rota: "rota.json",
        regBlocks: "reg_blocks.json",
    };

    const [registrars, rota, regBlocks] = await Promise.all([
        fetchJSON(files.registrars),
        fetchJSON(files.rota),
        fetchJSON(files.regBlocks),
    ]);

    // Function to parse the date from dd/mm/yyyy format to Date object
    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split("/").map((part) => parseInt(part, 10));
        return new Date(year, month - 1, day); // Month is 0-based in JavaScript
    };

    // Convert the 'dd Month yyyy' format to Date object for comparison
    const parseRotaDate = (rotaDateString) => {
        const [day, month, year] = rotaDateString.split(" ");
        const monthIndex = new Date(`${month} 1, 2020`).getMonth(); // Get month index from month name
        return new Date(year, monthIndex, parseInt(day, 10));
    };

    // Function to highlight AAU data
    const getAAUShift = (date, session) => {
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const shiftType = `${date.toLocaleDateString("en-US", { weekday: "long" })} ${session}`;

        return rota.find((shift) => {
            const shiftDate = parseRotaDate(shift["Date"]);
            return shiftDate.getTime() === date.getTime() && shift["Shift Type"] === shiftType;
        })?.Registrar || null;
    };

    const getBlock = (registrar, date) => {
        const blocksData = regBlocks[registrar]?.Blocks || [];
        for (let block of blocksData) {
            const startDate = new Date(block.start_year, new Date(`${block.start_month} 1`).getMonth(), 1);
            const endDate = new Date(block.end_year, new Date(`${block.end_month} 1`).getMonth() + 1, 0);
            if (date >= startDate && date <= endDate) {
                return block.block_name;
            }
        }
        return null;
    };

    dateInput.addEventListener("change", () => {
        const selectedDate = parseDate(dateInput.value);
        tbody.innerHTML = "";

        if (!selectedDate) return;

        registrars.forEach((registrar) => {
            const registrarName = registrar.name;
            let amActivity = "";
            let pmActivity = "";

            const aauAM = getAAUShift(selectedDate, "AM");
            const aauPM = getAAUShift(selectedDate, "PM");

            if (aauAM === registrarName) amActivity = "AAU";
            if (aauPM === registrarName) pmActivity = "AAU";

            if (!amActivity) {
                const blockName = getBlock(registrarName, selectedDate);
                amActivity = blockName || "";
            }
            if (!pmActivity) {
                const blockName = getBlock(registrarName, selectedDate);
                pmActivity = blockName || "";
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${registrarName}</td>
                <td class="${amActivity === "AAU" ? "aau-highlight" : ""}">${amActivity}</td>
                <td class="${pmActivity === "AAU" ? "aau-highlight" : ""}">${pmActivity}</td>
            `;
            tbody.appendChild(row);
        });

        scheduleTable.style.display = "table";
    });
});
