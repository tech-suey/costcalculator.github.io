// Function to handle port change and display custom port input
function handlePortChange() {
    const portSelect = document.getElementById("portOfLoad");
    const customPortContainer = document.getElementById("customPortContainer");
    const customPortAmount = document.getElementById("customPortAmount");

    if (portSelect.value === "Custom") {
        customPortContainer.style.display = "block";
    } else {
        customPortContainer.style.display = "none";
        customPortAmount.value = ""; // Clear the custom amount when not in use
    }
}

// Function to get ocean freight rate based on user selection
function getPortValue() {
    const portSelect = document.getElementById("portOfLoad");
    const selectedPort = portSelect.value;
    const customPortAmount = parseFloat(document.getElementById("customPortAmount").value);

    // Switch statement used below to get ocean freight value
    switch (selectedPort) {
        case 'Shekou':
            return 6500;
        case 'Xingang':
            return 6600;
        case 'Qindao':
            return 6650;
        case 'Paranagua':
            return 2150;
        case 'Custom':
            return isNaN(customPortAmount) ? 0 : customPortAmount; // Return 0 if input is not a number
        default:
            return 0;
    }
}

function oceanFreightToRand(oceanFreight, roe) {
    return oceanFreight * roe;
}

// Function to calculate agency fee
function calculateAgencyFee(totalDisbursements) {
    const agency = 0.01;
    return totalDisbursements * agency;
}

// Function to calculate finance fee
function calculateFinanceFee(totalDisbursements) {
    const primeRate = 0.1175;
    const daysInAYear = 365;
    const financed = 45;
    return ((totalDisbursements * financed) / daysInAYear) * primeRate;
}

// Function to calculate clearing charges
function calculateClearingCharges(totalDisbursements) {
    const docFee = 400;
    const agencyFee = calculateAgencyFee(totalDisbursements);
    const financeFee = calculateFinanceFee(totalDisbursements);
    return agencyFee + financeFee + docFee;
}

// Function to calculate factor
function calculateFactor(totalDisbursements, customsVat, haulageTotal, clearingCharges, customsValue, invoiceValue) {
    const lessVat = totalDisbursements - customsVat;
    return (lessVat + haulageTotal + clearingCharges + customsValue) / invoiceValue;
}

// Function to calculate landed cost
function calculateLandedCost(unitPrice, factor) {
    return unitPrice * factor;
}

// Main function to calculate cost
function calculateCost() {
    const roe = parseFloat(document.getElementById('exchangeRate').value);
    const dutyPercentage = parseFloat(document.getElementById("dutyPercentage").value) / 100;
    const unitPrice = parseFloat(document.getElementById("unitPrice").value);
    const loadQty = parseFloat(document.getElementById("containerLoad").value);
    let invoiceTotal = parseFloat(document.getElementById("invoiceTotal").value);
    const cargoWeight = parseFloat(document.getElementById("cargoWeight").value);

    console.log("ROE: ", roe);
    console.log("Duty Percentage: ", dutyPercentage);
    console.log("Unit Price: ", unitPrice);
    console.log("Load Quantity: ", loadQty);
    console.log("Invoice Total: ", invoiceTotal);
    console.log("Cargo Weight: ", cargoWeight);

    // Calculate invoice value
    let invoiceValue;
    if (!isNaN(invoiceTotal) && invoiceTotal > 0) {
        invoiceValue = invoiceTotal;
    } else if (!isNaN(loadQty) && loadQty > 0) {
        invoiceValue = unitPrice * loadQty;
    } else {
        console.error("Invoice Total and Load Quantity are both invalid.");
        return;
    }

    console.log("Invoice Value: ", invoiceValue);

    // Calculate customs value
    const customsValue = invoiceValue * roe;

    console.log("Customs Value: ", customsValue);

    // Calculate customs duty and VAT
    const customsDuty = customsValue * dutyPercentage;
    const customsVat = (customsValue + customsDuty) * 0.15;

    console.log("Customs Duty: ", customsDuty);
    console.log("Customs VAT: ", customsVat);

    // Define fixed charges
    const cargoDues = 3635.80;
    const terminalHandling = 3671;
    const carrierReleaseFees = 3035;
    const shippingLineCharges = terminalHandling + carrierReleaseFees;

    console.log("Cargo Dues: ", cargoDues);
    console.log("Shipping Line Charges: ", shippingLineCharges);

    // Calculate haulage charges
    let haulage;
    const containerWeight = 4100;
    const totalCargoWeight = cargoWeight + containerWeight;
    const fuelSurcharge = 0.12;
    if (totalCargoWeight < 24000) {
        haulage = 17496;
    } else {
        haulage = 18900;
    }
    const turnIn = 6800;
    const fuelSurchargeAmount = haulage * fuelSurcharge;
    const haulageTotal = haulage + turnIn + fuelSurchargeAmount;

    console.log("Haulage: ", haulage);
    console.log("Haulage Total: ", haulageTotal);

    // Calculate ocean freight in rand
    const oceanFreight = getPortValue();
    const oceanFreightRand = oceanFreightToRand(oceanFreight, roe);

    console.log("Ocean Freight: ", oceanFreight);
    console.log("Ocean Freight Rand: ", oceanFreightRand);

    // Calculate total disbursements
    const totalDisbursements = customsDuty + customsVat + cargoDues + shippingLineCharges + oceanFreightRand;

    console.log("Total Disbursements: ", totalDisbursements);

    // Calculate clearing charges
    const clearingCharges = calculateClearingCharges(totalDisbursements);

    console.log("Clearing Charges: ", clearingCharges);

    // Calculate factor
    const factor = calculateFactor(totalDisbursements, customsVat, haulageTotal, clearingCharges, customsValue, invoiceValue);

    console.log("Factor: ", factor);

    // Calculate landed cost
    const landedCost = calculateLandedCost(unitPrice, factor);
    const roundedLandedCost = landedCost.toFixed(2);

// Show results container
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.style.display = 'block';
    // Update the results div with the calculated values
    document.getElementById("landedCostResult").innerText = `Landed Cost: R${roundedLandedCost}`;
    document.getElementById("oceanFreightResult").innerText = `Ocean Freight: $${oceanFreight.toFixed(2)}`;
    document.getElementById("customsDutyResult").innerText = `Customs Duty: R${customsDuty.toFixed(2)}`;
    document.getElementById("customsVatResult").innerText = `Customs VAT: R${customsVat.toFixed(2)}`;
    document.getElementById("cargoDuesResult").innerText = `Cargo Dues: R${cargoDues.toFixed(2)}`;
    document.getElementById("shippingLineChargesResult").innerText = `Shipping Line Charges: R${shippingLineCharges.toFixed(2)}`;
    document.getElementById("haulageTotalResult").innerText = `Haulage Total: R${haulageTotal.toFixed(2)}`;
    document.getElementById("clearingChargesResult").innerText = `Clearing Charges: R${clearingCharges.toFixed(2)}`;
    document.getElementById("factorResult").innerText = `Factor: ${factor.toFixed(2)}`;

    // Show the results container
    document.getElementById("resultsContainer").style.display = 'block';
}

function closeResults() {
    let resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.style.display = 'none';
}
