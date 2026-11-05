/* =========================================
   DCN VIRTUAL LAB - SCRIPT.JS
   Tabs + VRC + 2D LRC + Quizzes
   ========================================= */


/* =========================================
   1. TAB NAVIGATION
   ========================================= */

function showSection(sectionId, button) {
    const sections = document.querySelectorAll(".lab-section");
    const buttons = document.querySelectorAll(".nav-btn");

    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection) return;

    sections.forEach(section =>
        section.classList.remove("active-section")
    );

    buttons.forEach(btn =>
        btn.classList.remove("active")
    );

    selectedSection.classList.add("active-section");

    const selectedButton = button ||
        document.querySelector(
            `.nav-btn[data-section="${sectionId}"]`
        );

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================
   2. COMMON FUNCTIONS
   ========================================= */

function getElement(id) {
    return document.getElementById(id);
}

function isBinary(value) {
    return /^[01]+$/.test(value);
}

function countOnes(value) {
    return (value.match(/1/g) || []).length;
}

function showMessage(elementId, message, type = "info") {
    const element = getElement(elementId);
    if (!element) return;

    const className = {
        success: "status-success",
        error: "status-error",
        info: "status-info"
    }[type];

    element.innerHTML =
        `<div class="${className}">${message}</div>`;
}

function renderBits(value, parityPosition = -1) {
    return `
        <div class="bit-display">
            ${value.split("").map((bit, index) => `
                <span class="bit ${
                    index === parityPosition ? "parity-bit" : ""
                }">${bit}</span>
            `).join("")}
        </div>
    `;
}


/* =========================================
   3. INTERACTIVE VRC SIMULATION
   ========================================= */

let vrcState = {
    originalFrame: "",
    frame: "",
    parityType: "even",
    changedPositions: [],
    manualParityChanged: false,
    generated: false
};


// Generate VRC frame
function generateVRC() {

    const data = getElement("vrcData").value.trim();
    const parityType = getElement("vrcParity").value;

    if (!data) {
        showMessage(
            "vrcOutput",
            "Please enter a binary data sequence.",
            "error"
        );
        return;
    }

    if (!isBinary(data)) {
        showMessage(
            "vrcOutput",
            "Enter only 0s and 1s.",
            "error"
        );
        return;
    }

    const ones = countOnes(data);

    let parityBit;

    if (parityType === "even") {
        parityBit = String(ones % 2);
    } else {
        parityBit = ones % 2 === 0 ? "1" : "0";
    }

    const frame = data + parityBit;

    vrcState = {
        originalFrame: frame,
        frame: frame,
        parityType: parityType,
        changedPositions: [],
        manualParityChanged: false,
        generated: true
    };

    renderVRCOutput();
}


// Display VRC frame and error detection together
function renderVRCOutput() {

    getElement("vrcOutput").innerHTML = `
        <p class="output-title">VRC Error Detection</p>

        <p><strong>Transmitted Frame:</strong></p>

        <p>Click any bit to toggle it.</p>

        ${renderVRCFrame()}

        <p class="helper-text">
            The last bit is the parity bit.
        </p>

        <div id="vrcDetectionStatus"></div>
    `;

    updateVRCResult();
}


// Display clickable VRC bits
function renderVRCFrame() {

    return `
        <div class="bit-display vrc-bit-display">

            ${vrcState.frame.split("").map((bit, index) => {

                const changed =
                    vrcState.changedPositions.includes(index);

                const isParityBit =
                    index === vrcState.frame.length - 1;

                return `
                    <button
                        type="button"
                        class="vrc-bit
                            ${isParityBit ? "parity-bit" : ""}
                            ${changed ? "error-bit" : ""}"
                        onclick="toggleVRCBit(${index})">

                        ${bit}

                    </button>
                `;

            }).join("")}

        </div>
    `;
}


// Toggle selected bit and automatically toggle parity
function toggleVRCBit(index) {

    if (!vrcState.generated) return;

    const parityIndex = vrcState.frame.length - 1;

    // Toggle a bit and track its position
    function flipBit(position) {

        const newBit =
            vrcState.frame[position] === "0" ? "1" : "0";

        vrcState.frame =
            vrcState.frame.substring(0, position) +
            newBit +
            vrcState.frame.substring(position + 1);

        const existingIndex =
            vrcState.changedPositions.indexOf(position);

        if (existingIndex >= 0) {
            vrcState.changedPositions.splice(existingIndex, 1);
        } else {
            vrcState.changedPositions.push(position);
        }
    }

    // Toggle selected bit
    flipBit(index);

    if (index === parityIndex) {

        // Track manual parity-bit changes separately
        vrcState.manualParityChanged =
            !vrcState.manualParityChanged;

    } else {

        // Automatically toggle parity when a data bit changes
        flipBit(parityIndex);
    }

    renderVRCOutput();
}


// Display VRC error detection result
function updateVRCResult() {

    const status = getElement("vrcDetectionStatus");

    if (!status) return;

    const parityIndex = vrcState.frame.length - 1;

    // Count only independently changed data bits
    const dataBitErrors =
        vrcState.changedPositions.filter(
            position => position !== parityIndex
        ).length;

    // Include independent manual parity-bit changes
    const totalErrors =
        dataBitErrors + (vrcState.manualParityChanged ? 1 : 0);

    // Odd number of changes is detected
    const errorDetected = totalErrors % 2 !== 0;

    status.innerHTML = errorDetected
        ? `<div class="status-error">Error detected!</div>`
        : `<div class="status-success">No error detected!</div>`;
}


/* =========================================
   4. INTERACTIVE 2D LRC SIMULATION
   ========================================= */

let lrcState = {
    rows: [],
    originalRows: [],
    rowParity: [],
    columnParity: "",
    cornerParity: "",
    changedPositions: [],
    generated: false
};


// Calculate even parity for one row
function calculateRowParity(row) {
    return String(countOnes(row) % 2);
}


// Calculate even parity for each column
function calculateColumnParity(rows) {

    const numberOfColumns = rows[0].length;
    let result = "";

    for (let col = 0; col < numberOfColumns; col++) {
        let ones = 0;

        for (let row = 0; row < rows.length; row++) {
            if (rows[row][col] === "1") {
                ones++;
            }
        }

        result += String(ones % 2);
    }

    return result;
}


// Calculate parity values from the CURRENT data
function calculateCurrentLRCParity() {

    const currentRowParity = lrcState.rows.map(row =>
        calculateRowParity(row)
    );

    const currentColumnParity =
        calculateColumnParity(lrcState.rows);

    const currentCornerParity =
        calculateRowParity(currentRowParity.join(""));

    return {
        rowParity: currentRowParity,
        columnParity: currentColumnParity,
        cornerParity: currentCornerParity
    };
}


// Compare current parity with ORIGINAL generated parity
function checkLRCParity() {

    const numberOfColumns = lrcState.rows[0].length;

    const currentParity = calculateCurrentLRCParity();

    const failedRows = [];
    const failedColumns = [];

    // Check row parity
    for (let row = 0; row < lrcState.rows.length; row++) {

        if (
            currentParity.rowParity[row] !==
            lrcState.rowParity[row]
        ) {
            failedRows.push(row + 1);
        }
    }

    // Check column parity
    for (let col = 0; col < numberOfColumns; col++) {

        if (
            currentParity.columnParity[col] !==
            lrcState.columnParity[col]
        ) {
            failedColumns.push(col + 1);
        }
    }

    return {
        failedRows,
        failedColumns,
        currentParity,
        numberOfColumns
    };
}


// Display 2D parity matrix
function renderLRCMatrix() {

    const rows = lrcState.rows;
    const numberOfColumns = rows[0].length;

    const currentParity = calculateCurrentLRCParity();

    let html = `
        <div class="table-container">
            <table class="lrc-matrix">
                <thead>
                    <tr>
                        <th></th>
    `;

    for (let col = 0; col < numberOfColumns; col++) {
        html += `<th>C${col + 1}</th>`;
    }

    html += `
                        <th>Row Parity</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Display data rows
    for (let row = 0; row < rows.length; row++) {

        html += `<tr><th>R${row + 1}</th>`;

        for (let col = 0; col < numberOfColumns; col++) {

            const changed = lrcState.changedPositions.includes(
                `R${row + 1}C${col + 1}`
            );

            html += `
                <td>
                    <button
                        type="button"
                        class="lrc-bit ${changed ? "error-bit" : ""}"
                        onclick="toggleLRCBit(${row}, ${col})"
                        title="Click to flip R${row + 1}C${col + 1}">
                        ${rows[row][col]}
                    </button>
                </td>
            `;
        }

        // Highlight row parity if it differs from original
        const rowChanged =
            currentParity.rowParity[row] !== lrcState.rowParity[row];

        html += `
            <td>
                <span class="bit parity-bit ${
                    rowChanged ? "parity-error" : ""
                }">
                    ${currentParity.rowParity[row]}
                </span>
            </td>
        </tr>
        `;
    }

    // Display recalculated column parity
    html += `<tr><th>Column parity</th>`;

    for (let col = 0; col < numberOfColumns; col++) {

        const columnChanged =
            currentParity.columnParity[col] !== lrcState.columnParity[col];

        html += `
            <td>
                <span class="bit parity-bit ${
                    columnChanged ? "parity-error" : ""
                }">
                    ${currentParity.columnParity[col]}
                </span>
            </td>
        `;
    }

    // Corner parity
    const cornerChanged =
        currentParity.cornerParity !== lrcState.cornerParity;

    html += `
        <td>
            <span class="bit parity-bit ${
                cornerChanged ? "parity-error" : ""
            }">
                ${currentParity.cornerParity}
            </span>
        </td>
    </tr>
        </tbody>
        </table>
        </div>
    `;

    return html;
}


// Generate 2D LRC
function generateLRC() {

    const rowIds = [
        "lrcRow1",
        "lrcRow2",
        "lrcRow3",
        "lrcRow4"
    ];

    const rows = rowIds.map(id =>
        getElement(id).value.trim()
    );

    if (rows.some(row => row === "")) {
        showMessage(
            "lrcOutput",
            "Please enter data in all four rows.",
            "error"
        );
        return;
    }

    if (rows.some(row => !isBinary(row))) {
        showMessage(
            "lrcOutput",
            "Invalid input. Enter only 0s and 1s.",
            "error"
        );
        return;
    }

    const length = rows[0].length;

    if (rows.some(row => row.length !== length)) {
        showMessage(
            "lrcOutput",
            "All four data rows must have the same number of bits.",
            "error"
        );
        return;
    }

    // Generate original row parity
    const rowParity = rows.map(row =>
        calculateRowParity(row)
    );

    // Generate original column parity
    const columnParity = calculateColumnParity(rows);

    // Generate original corner parity
    const cornerParity =
        calculateRowParity(rowParity.join(""));

    // Store original parity separately
    lrcState = {
        rows: [...rows],
        originalRows: [...rows],
        rowParity: [...rowParity],
        columnParity: columnParity,
        cornerParity: cornerParity,
        changedPositions: [],
        generated: true
    };

    getElement("lrcOutput").innerHTML = `
        <p class="output-title">2D LRC Generation Result</p>

        <p>
            Click any data bit in the matrix below to introduce
            a transmission error.
        </p>

        ${renderLRCMatrix()}

        <div class="status-success">
            2D LRC generated successfully using even parity.
        </div>
    `;

    getElement("lrcErrorOutput").innerHTML = `
        <p>Click any data bit in the matrix to test error detection.</p>
    `;
}


// Flip a data bit when the user clicks it
function toggleLRCBit(row, col) {

    if (!lrcState.generated) {
        return;
    }

    const currentBit = lrcState.rows[row][col];

    const newBit = currentBit === "0" ? "1" : "0";

    // Change the selected data bit
    lrcState.rows[row] =
        lrcState.rows[row].substring(0, col) +
        newBit +
        lrcState.rows[row].substring(col + 1);

    const position = `R${row + 1}C${col + 1}`;

    const existingIndex =
        lrcState.changedPositions.indexOf(position);

    // Restore the bit if it was already changed
    if (existingIndex >= 0) {
        lrcState.changedPositions.splice(existingIndex, 1);
    } else {
        lrcState.changedPositions.push(position);
    }

    // Recalculate and display updated parity values
    getElement("lrcOutput").innerHTML = `
        <p class="output-title">2D LRC Parity Matrix</p>

        <p>
            Click any data bit to introduce another error.
            Click a changed bit again to restore it.
        </p>

        ${renderLRCMatrix()}

        <div class="status-info">
            Bit ${position} changed from ${currentBit} to ${newBit}.
        </div>
    `;

    // Display error detection result
    displayLRCErrorResult();
}


// Display error detection result
function displayLRCErrorResult() {

    const output = document.getElementById("lrcErrorOutput");

    const positions = lrcState.changedPositions.map(pos => {
        const match = pos.match(/R(\d+)C(\d+)/);

        return {
            name: pos,
            row: Number(match[1]),
            col: Number(match[2])
        };
    });

    // Store positions belonging to rectangular patterns
    const rectanglePositions = new Set();

    // Find every 2 x 2 rectangle among the changed bits
    for (let i = 0; i < positions.length; i++) {

        for (let j = i + 1; j < positions.length; j++) {

            const row1 = positions[i].row;
            const row2 = positions[j].row;

            if (row1 === row2) continue;

            for (let k = 0; k < positions.length; k++) {

                for (let l = k + 1; l < positions.length; l++) {

                    const col1 = positions[k].col;
                    const col2 = positions[l].col;

                    if (col1 === col2) continue;

                    // Check whether all four rectangle corners exist
                    const rectangle = [
                        `R${row1}C${col1}`,
                        `R${row1}C${col2}`,
                        `R${row2}C${col1}`,
                        `R${row2}C${col2}`
                    ];

                    const allFourPresent = rectangle.every(pos =>
                        positions.some(p => p.name === pos)
                    );

                    if (allFourPresent) {
                        rectangle.forEach(pos =>
                            rectanglePositions.add(pos)
                        );
                    }
                }
            }
        }
    }

    // Exclude rectangle positions
    const remainingPositions = positions.filter(p =>
        !rectanglePositions.has(p.name)
    );

    // No changed bits
    if (positions.length === 0) {

        output.innerHTML = `
            <div class="success-result">
                <h3>No error detected!</h3>
                <p>All parity values match the original generated parity.</p>
            </div>
        `;
    }

    // All changed bits belong to a rectangle
    else if (remainingPositions.length === 0) {

        output.innerHTML = `
            <div class="error-result">
                <h3>Undetected error pattern!</h3>
                <p>
                   For this pattern error cannot be detected
                </p>
            </div>
        `;
    }

    // Display only positions outside rectangular patterns
    else {

        output.innerHTML = `
            <div class="error-result">
                <h3>Error detected!</h3>
                <p>
                    <strong>Error detected in:</strong>
                    ${remainingPositions.map(p => p.name).join(", ")}
                </p>
            </div>
        `;
    }
}


/* =========================================
   6. PRE-TEST QUESTIONS
   ========================================= */

const preQuestions = [
    {
        question: "1. What is the main purpose of error detection?",
        options: [
            "To increase the size of a monitor",
            "To identify possible errors in received data",
            "To reduce the number of computers",
            "To convert all data into decimal"
        ],
        answer: 1
    },
    {
        question: "2. What does VRC stand for?",
        options: [
            "Vertical Redundancy Check",
            "Variable Routing Code",
            "Virtual Receiver Control",
            "Verified Random Check"
        ],
        answer: 0
    },
    {
        question: "3. In even parity, the total number of 1s should be:",
        options: [
            "Always odd",
            "Always zero",
            "Even",
            "Always one"
        ],
        answer: 2
    },
    {
        question: "4. Which technique checks parity across columns?",
        options: [
            "Routing",
            "LRC",
            "Encryption",
            "Compression"
        ],
        answer: 1
    },
    {
        question: "5. What is a parity bit?",
        options: [
            "A bit added for error detection",
            "A bit that always equals zero",
            "A bit that removes all errors",
            "A bit used only for addressing"
        ],
        answer: 0
    }
];


/* =========================================
   7. POST-TEST QUESTIONS
   ========================================= */

const postQuestions = [
    {
        question: "1. A data sequence contains three 1s. What is its even parity bit?",
        options: [
            "0",
            "1",
            "Both 0 and 1",
            "Cannot be calculated"
        ],
        answer: 1
    },
    {
        question: "2. What happens if one data bit changes in a VRC frame?",
        options: [
            "Parity check always passes",
            "Parity mismatch is detected",
            "Data is automatically corrected",
            "Frame becomes shorter"
        ],
        answer: 1
    },
    {
        question: "3. In 2D LRC, what is calculated for each data row?",
        options: [
            "Row parity",
            "Encryption key",
            "Checksum only",
            "Address"
        ],
        answer: 0
    },
    {
        question: "4. How can a single-bit error be located using 2D parity?",
        options: [
            "By checking only the first row",
            "By finding the intersection of the failed row and column",
            "By counting all zeros",
            "By sorting the data"
        ],
        answer: 1
    },
    {
        question: "5. What happens with a four-bit rectangular error pattern?",
        options: [
            "It is always corrected",
            "It is always detected",
            "It may pass both row and column parity checks",
            "It changes the number of data rows"
        ],
        answer: 2
    }
];


/* =========================================
   8. QUIZ GENERATION
   ========================================= */

function renderQuiz(containerId, questions, prefix) {

    const container = getElement(containerId);
    if (!container) return;

    container.innerHTML = questions.map((question, index) => `
        <fieldset class="quiz-question">

            <legend>${question.question}</legend>

            <div class="quiz-options">

                ${question.options.map((option, optionIndex) => `
                    <label class="quiz-option">

                        <input
                            type="radio"
                            name="${prefix}-${index}"
                            value="${optionIndex}"
                        >

                        <span>${option}</span>

                    </label>
                `).join("")}

            </div>

        </fieldset>
    `).join("");
}


/* =========================================
   9. QUIZ EVALUATION
   ========================================= */

function gradeQuiz(type) {

    const isPreTest = type === "pre";

    const questions = isPreTest
        ? preQuestions
        : postQuestions;

    const prefix = isPreTest ? "pre" : "post";

    const resultId = isPreTest
        ? "preQuizResult"
        : "postQuizResult";

    let score = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {

        const selected = document.querySelector(
            `input[name="${prefix}-${index}"]:checked`
        );

        if (!selected) {
            unanswered++;
            return;
        }

        if (Number(selected.value) === question.answer) {
            score++;
        }
    });

    const percentage = Math.round(
        (score / questions.length) * 100
    );

    getElement(resultId).innerHTML = `
        <div class="${
            percentage >= 60 ? "status-success" : "status-info"
        }">

            <p><strong>${isPreTest ? "Pre-Test" : "Post-Test"} Result</strong></p>

            <p>Score: ${score} / ${questions.length}</p>

            <p>Percentage: ${percentage}%</p>

            ${
                unanswered > 0
                    ? `<p>Unanswered questions: ${unanswered}</p>`
                    : ""
            }

            <p>
                ${
                    percentage >= 80
                        ? "Excellent work!"
                        : percentage >= 60
                            ? "Good effort! Keep practising."
                            : "Review the theory and try again."
                }
            </p>

        </div>
    `;
}


/* =========================================
   10. INITIALIZE WEBSITE
   ========================================= */

document.addEventListener("DOMContentLoaded", function () {

    showSection("aim");

    renderQuiz("preQuiz", preQuestions, "pre");

    renderQuiz("postQuiz", postQuestions, "post");

});