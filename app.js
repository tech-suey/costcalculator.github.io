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
async function getPortValue() {
    const portSelect = document.getElementById("portOfLoad");
    const selectedPort = portSelect.value;
    const customPortAmount = parseFloat(document.getElementById("customPortAmount").value);

    // Return custom value immediately if selected
    if (selectedPort === 'Custom') {
        return isNaN(customPortAmount) ? 0 : customPortAmount;
    }

    // Fetch ocean freight rates from database
    try {
        const { data, error } = await supabaseClient
            .from('ocean_freight')
            .select('port_name, amount')
            .eq('port_name', selectedPort);
        
        if (error) throw error;
        
        if (data.length > 0) {
            return data[0].amount;
        }
    } catch (error) {
        console.error('Error fetching ocean freight:', error);
    }
    
    return 0;
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
async function calculateFinanceFee(totalDisbursements) {
    try {
        const { data, error } = await supabaseClient
            .from('freight_charges')
            .select('amount')
            .eq('charge_type', 'prime_rate')
            .single();
        
        if (error) throw error;
        
        const primeRate = data?.amount || 0;
        const daysInAYear = 365;
        const financed = 45;
        return ((totalDisbursements * financed) / daysInAYear) * (primeRate / 100);
        } catch (error) {
        console.error('Error fetching prime rate:', error);
        return 0;
    }
}

// Function to calculate clearing charges
async function calculateClearingCharges(totalDisbursements) {
    try {
        // Get documentation fee
        const { data: docData, error: docError } = await supabaseClient
            .from('freight_charges')
            .select('amount')
            .eq('charge_type', 'documentation')
            .single();
        
        if (docError) throw docError;
        const docFee = docData?.amount || 0;

        const agencyFee = calculateAgencyFee(totalDisbursements);
        const financeFee = await calculateFinanceFee(totalDisbursements);
        
        return agencyFee + financeFee + docFee;
    } catch (error) {
        console.error('Error calculating clearing charges:', error);
        return 0;
    }
}
//function to calculate insurance 
function calculateInsurance(customsDuty,customsValue,clearingCharges,shippingLineCharges, cargoDues, oceanFreightRand ) {
    const caInvoiceValue = customsDuty + clearingCharges + shippingLineCharges + cargoDues +  oceanFreightRand + customsValue;
    const caInvoiceValueMu = caInvoiceValue + (caInvoiceValue * .10)
    const insurancePremium = 0.002
    const insurance = caInvoiceValueMu * insurancePremium
    return insurance
}

// Function to calculate factor
function calculateFactor(totalDisbursements, customsVat, haulageTotal, clearingCharges, customsValue, invoiceValue, insurance) {
    const lessVat = totalDisbursements - customsVat;
    return (lessVat + haulageTotal + clearingCharges + insurance + customsValue) / invoiceValue;
}

// Function to calculate landed cost
function calculateLandedCost(unitPrice, factor) {
    return unitPrice * factor;
}



// Main function to calculate cost
async function calculateCost() {
    const roe = parseFloat(document.getElementById('exchangeRate').value);
    const dutyPercentage = parseFloat(document.getElementById("dutyPercentage").value) / 100;
    const unitPrice = parseFloat(document.getElementById("unitPrice").value);
    const loadQty = parseFloat(document.getElementById("containerLoad").value);
    let invoiceTotal = parseFloat(document.getElementById("invoiceTotal").value);
    const cargoWeight = parseFloat(document.getElementById("cargoWeight").value);

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

    // Calculate customs value
    const customsValue = invoiceValue * roe;

    // Calculate customs duty and VAT
    const customsDuty = customsValue * dutyPercentage;
    const customsVat = (customsValue + customsDuty) * 0.15;

    // Fetch fixed charges
    let cargoDues = 0;
    let terminalHandling = 0;
    let carrierReleaseFees = 0;
    
    try {
        const { data, error } = await supabaseClient
            .from('freight_charges')
            .select('charge_type, amount');
        
        if (error) throw error;
        
        data.forEach(item => {
            switch(item.charge_type) {
                case 'cargo_dues':
                    cargoDues = item.amount;
                    break;
                case 'terminal_handling':
                    terminalHandling = item.amount;
                    break;
                case 'carrier_charges':
                    carrierReleaseFees = item.amount;
                    break;
            }
        });
    } catch (error) {
        console.error('Error fetching freight charges:', error);
    }
    
    const shippingLineCharges = terminalHandling + carrierReleaseFees;

    // Calculate haulage charges
    let haulageLight = 0;
    let haulageHeavy = 0;
    let turnIn = 0;
    let fuelSurchargePercentage = 0;
    
    try {
        const { data, error } = await supabaseClient
            .from('haulage_charges')
            .select('charge_type, amount');
        
        if (error) throw error;
        
        data.forEach(item => {
            switch(item.charge_type) {
                case 'haulage_light':
                    haulageLight = item.amount;
                    break;
                case 'haulage_heavy':
                    haulageHeavy = item.amount;
                    break;
                case 'empty_return':
                    turnIn = item.amount;
                    break;
                case 'fuel_surcharge':
                    fuelSurchargePercentage = item.amount;
                    break;
            }
        });
    } catch (error) {
        console.error('Error fetching haulage charges:', error);
    }

    let haulage;
    const containerWeight = 4100;
    const totalCargoWeight = cargoWeight + containerWeight;
    const fuelSurcharge = fuelSurchargePercentage / 100;
    
    if (totalCargoWeight < 24000) {
        haulage = haulageLight;
    } else {
        haulage = haulageHeavy;
    }
    
    const fuelSurchargeAmount = haulage * fuelSurcharge;
    const haulageTotal = haulage + turnIn + fuelSurchargeAmount;

    // Calculate ocean freight in rand
    const oceanFreight = await getPortValue();
    const oceanFreightRand = oceanFreightToRand(oceanFreight, roe);

    // Calculate total disbursements
    const totalDisbursements = customsDuty + customsVat + cargoDues + shippingLineCharges + oceanFreightRand;

    // Calculate clearing charges
    const clearingCharges = await calculateClearingCharges(totalDisbursements);

    //calculate Insurance
    const insurance = calculateInsurance(customsDuty,customsValue,clearingCharges,shippingLineCharges, cargoDues, oceanFreightRand )

    // Calculate factor
    const factor = calculateFactor(totalDisbursements, customsVat, haulageTotal, clearingCharges, customsValue, invoiceValue, insurance);

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
    document.getElementById("insuranceResult").innerText = `Insurance Amount: R${insurance.toFixed(2)}`;
    document.getElementById("factorResult").innerText = `Factor: ${factor.toFixed(2)}`;
}

function closeResults() {
    let resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.style.display = 'none';
}