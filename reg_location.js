document.addEventListener("DOMContentLoaded", async () => {
    const dateInput = document.getElementById("date");
    const scheduleTable = document.getElementById("scheduleTable");
    const tbody = scheduleTable.querySelector("tbody");

    // Set today's date in the date picker
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;

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

    const parseDate = (dateString) => {
        // Parse dates like "16 Sep 2024"
        const [day, month, year] = dateString.split(' ');
        const monthNames = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        return new Date(year, monthNames[month], parseInt(day));
    };

    const formatDateForComparison = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate().toString();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const isOnLeave = (registrar, date) => {
        const registrarData = registrars.find(r => r.name === registrar);
        if (!registrarData || !registrarData.leave_records) return false;

        const formattedDate = formatDateForComparison(date);
        
        for (const leave of registrarData.leave_records) {
            const startDate = parseDate(leave.start);
            const endDate = parseDate(leave.end);
            const checkDate = parseDate(formattedDate);
            
            if (checkDate >= startDate && checkDate <= endDate) {
                return true;
            }
        }
        return false;
    };

    const isWeekend = (date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday (0) or Saturday (6)
    };

    const getAAUShift = (date, session) => {
        // Updated date formatting to include leading zeros for days
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString("en-GB", { month: "long" });
        const year = date.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;
        
        const shiftType = `${date.toLocaleDateString("en-US", { weekday: "long" })} ${session}`;
        return rota.find((shift) => 
            shift["Date"] === formattedDate && 
            shift["Shift Type"] === shiftType
        )?.Registrar || null;
    };

    const getBlock = (registrar, date) => {
        const blocksData = regBlocks[registrar]?.Blocks || [];
        for (let block of blocksData) {
            const startDate = new Date(
                block.start_year, 
                new Date(`${block.start_month} 1`).getMonth(), 
                1
            );
            const endDate = new Date(
                block.end_year, 
                new Date(`${block.end_month} 1`).getMonth() + 1, 
                0
            );
            if (date >= startDate && date <= endDate) {
                return `${block.block_name} block`;
            }
        }
        return null;
    };

    const updateSchedule = () => {
        const selectedDate = new Date(dateInput.value);
        tbody.innerHTML = "";
        
        if (!selectedDate) return;

        registrars.forEach((registrar) => {
            const registrarName = registrar.name;
            let amActivity = "";
            let pmActivity = "";

            // Check for leave first
            if (isOnLeave(registrarName, selectedDate)) {
                amActivity = "Leave";
                pmActivity = "Leave";
            } else {
                if (isWeekend(selectedDate)) {
                    const aauAM = getAAUShift(selectedDate, "AM");
                    const aauPM = getAAUShift(selectedDate, "PM");
                    amActivity = aauAM === registrarName ? "AAU" : "";
                    pmActivity = aauPM === registrarName ? "AAU" : "";
                } else {
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
                }
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
    };

    // Add event listener for date changes
    dateInput.addEventListener("change", updateSchedule);

    // Initial load with today's data
    updateSchedule();
});
