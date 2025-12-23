// Pre-populated table data for samples, tests, and results
// Contains ~1000 records each with realistic, varied data

// Helper function to generate random date within range
function randomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

// Helper function to random choice from array
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to random number in range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to random float in range
function randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Generate samples data (~1000 records)
export function getSamplesData() {
    const sampleTypes = [
        'Blood', 'Urine', 'Serum', 'Plasma', 'Whole Blood', 'Stool', 'Sputum',
        'Tissue', 'Bone Marrow', 'Cerebrospinal Fluid', 'Synovial Fluid', 'Ascitic Fluid',
        'Pleural Fluid', 'Pericardial Fluid', 'Semen', 'Saliva', 'Swab', 'Biopsy'
    ];
    
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'rejected', 'on_hold'];
    
    const samples = [];
    const baseDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');
    
    for (let i = 1; i <= 1000; i++) {
        const sampleId = i;
        const sampleType = randomChoice(sampleTypes);
        const sampleName = `${sampleType}-${String(i).padStart(6, '0')}-${randomChoice(['A', 'B', 'C', 'D', 'E'])}`;
        const collectionDate = randomDate(baseDate, endDate);
        const status = randomChoice(statuses);
        const labId = randomInt(1, 25); // 25 different labs
        
        samples.push([sampleId, sampleName, sampleType, collectionDate, status, labId]);
    }
    
    return samples;
}

// Generate tests data (~1000 records)
export function getTestsData() {
    const testData = [
        // Hematology tests
        { name: 'Complete Blood Count', type: 'Hematology', method: 'Flow Cytometry', unit: 'cells/μL', range: '4500-11000' },
        { name: 'Hemoglobin', type: 'Hematology', method: 'Spectrophotometry', unit: 'g/dL', range: '12.0-17.5' },
        { name: 'Hematocrit', type: 'Hematology', method: 'Centrifugation', unit: '%', range: '36.0-52.0' },
        { name: 'White Blood Cell Count', type: 'Hematology', method: 'Flow Cytometry', unit: 'cells/μL', range: '4000-11000' },
        { name: 'Red Blood Cell Count', type: 'Hematology', method: 'Flow Cytometry', unit: 'million/μL', range: '4.5-5.9' },
        { name: 'Platelet Count', type: 'Hematology', method: 'Flow Cytometry', unit: 'platelets/μL', range: '150000-450000' },
        { name: 'Mean Corpuscular Volume', type: 'Hematology', method: 'Calculated', unit: 'fL', range: '80-100' },
        { name: 'Mean Corpuscular Hemoglobin', type: 'Hematology', method: 'Calculated', unit: 'pg', range: '27-31' },
        { name: 'Differential Count', type: 'Hematology', method: 'Microscopy', unit: '%', range: '0-100' },
        
        // Chemistry tests
        { name: 'Glucose', type: 'Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '70-100' },
        { name: 'Creatinine', type: 'Chemistry', method: 'Jaffé Reaction', unit: 'mg/dL', range: '0.6-1.2' },
        { name: 'Blood Urea Nitrogen', type: 'Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '7-20' },
        { name: 'Total Cholesterol', type: 'Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '<200' },
        { name: 'HDL Cholesterol', type: 'Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '>40' },
        { name: 'LDL Cholesterol', type: 'Chemistry', method: 'Calculated', unit: 'mg/dL', range: '<100' },
        { name: 'Triglycerides', type: 'Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '<150' },
        { name: 'Total Protein', type: 'Chemistry', method: 'Biuret', unit: 'g/dL', range: '6.0-8.3' },
        { name: 'Albumin', type: 'Chemistry', method: 'Bromocresol Green', unit: 'g/dL', range: '3.5-5.0' },
        { name: 'Alanine Aminotransferase', type: 'Chemistry', method: 'Enzymatic', unit: 'U/L', range: '7-56' },
        { name: 'Aspartate Aminotransferase', type: 'Chemistry', method: 'Enzymatic', unit: 'U/L', range: '10-40' },
        { name: 'Alkaline Phosphatase', type: 'Chemistry', method: 'Enzymatic', unit: 'U/L', range: '44-147' },
        { name: 'Total Bilirubin', type: 'Chemistry', method: 'Diazo', unit: 'mg/dL', range: '0.3-1.2' },
        { name: 'Direct Bilirubin', type: 'Chemistry', method: 'Diazo', unit: 'mg/dL', range: '0.0-0.3' },
        { name: 'Calcium', type: 'Chemistry', method: 'Atomic Absorption', unit: 'mg/dL', range: '8.5-10.5' },
        { name: 'Phosphorus', type: 'Chemistry', method: 'Colorimetric', unit: 'mg/dL', range: '2.5-4.5' },
        { name: 'Magnesium', type: 'Chemistry', method: 'Colorimetric', unit: 'mg/dL', range: '1.7-2.2' },
        { name: 'Sodium', type: 'Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '136-145' },
        { name: 'Potassium', type: 'Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '3.5-5.0' },
        { name: 'Chloride', type: 'Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '98-107' },
        { name: 'Carbon Dioxide', type: 'Chemistry', method: 'Enzymatic', unit: 'mEq/L', range: '22-29' },
        { name: 'Lactate Dehydrogenase', type: 'Chemistry', method: 'Enzymatic', unit: 'U/L', range: '140-280' },
        { name: 'Creatine Kinase', type: 'Chemistry', method: 'Enzymatic', unit: 'U/L', range: '30-200' },
        { name: 'Troponin I', type: 'Chemistry', method: 'Chemiluminescence', unit: 'ng/mL', range: '<0.04' },
        { name: 'BNP', type: 'Chemistry', method: 'Chemiluminescence', unit: 'pg/mL', range: '<100' },
        
        // Immunology tests
        { name: 'IgG', type: 'Immunology', method: 'Nephelometry', unit: 'mg/dL', range: '700-1600' },
        { name: 'IgA', type: 'Immunology', method: 'Nephelometry', unit: 'mg/dL', range: '70-400' },
        { name: 'IgM', type: 'Immunology', method: 'Nephelometry', unit: 'mg/dL', range: '40-230' },
        { name: 'IgE', type: 'Immunology', method: 'ELISA', unit: 'IU/mL', range: '<87' },
        { name: 'C-Reactive Protein', type: 'Immunology', method: 'Nephelometry', unit: 'mg/L', range: '<3.0' },
        { name: 'ESR', type: 'Immunology', method: 'Westergren', unit: 'mm/hr', range: '0-20' },
        { name: 'Rheumatoid Factor', type: 'Immunology', method: 'Nephelometry', unit: 'IU/mL', range: '<14' },
        { name: 'Anti-CCP', type: 'Immunology', method: 'ELISA', unit: 'U/mL', range: '<20' },
        { name: 'ANA', type: 'Immunology', method: 'IFA', unit: 'titer', range: '<1:80' },
        { name: 'Complement C3', type: 'Immunology', method: 'Nephelometry', unit: 'mg/dL', range: '90-180' },
        { name: 'Complement C4', type: 'Immunology', method: 'Nephelometry', unit: 'mg/dL', range: '10-40' },
        
        // Microbiology tests
        { name: 'Culture and Sensitivity', type: 'Microbiology', method: 'Agar Culture', unit: 'N/A', range: 'Negative' },
        { name: 'Gram Stain', type: 'Microbiology', method: 'Microscopy', unit: 'N/A', range: 'Negative' },
        { name: 'Blood Culture', type: 'Microbiology', method: 'Automated Culture', unit: 'N/A', range: 'No Growth' },
        { name: 'Urine Culture', type: 'Microbiology', method: 'Agar Culture', unit: 'CFU/mL', range: '<10000' },
        { name: 'Sputum Culture', type: 'Microbiology', method: 'Agar Culture', unit: 'N/A', range: 'Normal Flora' },
        { name: 'Stool Culture', type: 'Microbiology', method: 'Selective Media', unit: 'N/A', range: 'Normal Flora' },
        { name: 'Ova and Parasites', type: 'Microbiology', method: 'Microscopy', unit: 'N/A', range: 'Negative' },
        { name: 'Clostridium difficile Toxin', type: 'Microbiology', method: 'EIA', unit: 'N/A', range: 'Negative' },
        { name: 'Helicobacter pylori Antigen', type: 'Microbiology', method: 'EIA', unit: 'N/A', range: 'Negative' },
        
        // Molecular tests
        { name: 'COVID-19 PCR', type: 'Molecular', method: 'RT-PCR', unit: 'N/A', range: 'Negative' },
        { name: 'Influenza A/B PCR', type: 'Molecular', method: 'RT-PCR', unit: 'N/A', range: 'Negative' },
        { name: 'RSV PCR', type: 'Molecular', method: 'RT-PCR', unit: 'N/A', range: 'Negative' },
        { name: 'Chlamydia trachomatis PCR', type: 'Molecular', method: 'PCR', unit: 'N/A', range: 'Negative' },
        { name: 'Neisseria gonorrhoeae PCR', type: 'Molecular', method: 'PCR', unit: 'N/A', range: 'Negative' },
        { name: 'HIV RNA Quantitative', type: 'Molecular', method: 'RT-PCR', unit: 'copies/mL', range: '<20' },
        { name: 'Hepatitis C RNA', type: 'Molecular', method: 'RT-PCR', unit: 'IU/mL', range: '<15' },
        { name: 'Hepatitis B DNA', type: 'Molecular', method: 'PCR', unit: 'IU/mL', range: '<10' },
        { name: 'CMV DNA', type: 'Molecular', method: 'PCR', unit: 'copies/mL', range: '<500' },
        { name: 'EBV DNA', type: 'Molecular', method: 'PCR', unit: 'copies/mL', range: '<500' },
        
        // Endocrinology tests
        { name: 'TSH', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'mIU/L', range: '0.4-4.0' },
        { name: 'Free T4', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/dL', range: '0.8-1.8' },
        { name: 'Free T3', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'pg/mL', range: '2.3-4.2' },
        { name: 'Cortisol', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'μg/dL', range: '5-25' },
        { name: 'ACTH', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'pg/mL', range: '7-50' },
        { name: 'Insulin', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'μIU/mL', range: '2-25' },
        { name: 'C-Peptide', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/mL', range: '0.8-3.5' },
        { name: 'Hemoglobin A1c', type: 'Endocrinology', method: 'HPLC', unit: '%', range: '<5.7' },
        { name: 'Testosterone', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/dL', range: '300-1000' },
        { name: 'Estradiol', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'pg/mL', range: '30-400' },
        { name: 'Progesterone', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/mL', range: '0.1-20' },
        { name: 'Prolactin', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/mL', range: '2-18' },
        { name: 'LH', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'mIU/mL', range: '1.5-9.0' },
        { name: 'FSH', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'mIU/mL', range: '1.5-12.0' },
        
        // Coagulation tests
        { name: 'PT', type: 'Coagulation', method: 'Clotting Assay', unit: 'seconds', range: '11-13.5' },
        { name: 'INR', type: 'Coagulation', method: 'Calculated', unit: 'ratio', range: '0.9-1.1' },
        { name: 'PTT', type: 'Coagulation', method: 'Clotting Assay', unit: 'seconds', range: '25-35' },
        { name: 'D-Dimer', type: 'Coagulation', method: 'Immunoassay', unit: 'μg/mL', range: '<0.5' },
        { name: 'Fibrinogen', type: 'Coagulation', method: 'Clotting Assay', unit: 'mg/dL', range: '200-400' },
        { name: 'Antithrombin III', type: 'Coagulation', method: 'Chromogenic', unit: '%', range: '80-120' },
        
        // Tumor markers
        { name: 'PSA', type: 'Oncology', method: 'Chemiluminescence', unit: 'ng/mL', range: '<4.0' },
        { name: 'CEA', type: 'Oncology', method: 'Chemiluminescence', unit: 'ng/mL', range: '<3.0' },
        { name: 'CA 19-9', type: 'Oncology', method: 'Chemiluminescence', unit: 'U/mL', range: '<37' },
        { name: 'CA 125', type: 'Oncology', method: 'Chemiluminescence', unit: 'U/mL', range: '<35' },
        { name: 'AFP', type: 'Oncology', method: 'Chemiluminescence', unit: 'ng/mL', range: '<10' },
        { name: 'CA 15-3', type: 'Oncology', method: 'Chemiluminescence', unit: 'U/mL', range: '<30' },
        
        // Other common tests
        { name: 'Vitamin D', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '30-100' },
        { name: 'Vitamin B12', type: 'Nutrition', method: 'Chemiluminescence', unit: 'pg/mL', range: '200-900' },
        { name: 'Folate', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '>4.0' },
        { name: 'Iron', type: 'Nutrition', method: 'Colorimetric', unit: 'μg/dL', range: '60-170' },
        { name: 'TIBC', type: 'Nutrition', method: 'Colorimetric', unit: 'μg/dL', range: '250-450' },
        { name: 'Ferritin', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '15-200' },
    ];
    
    const tests = [];
    
    // Generate ~1000 test records by cycling through and adding variations
    for (let i = 1; i <= 1000; i++) {
        const testInfo = testData[(i - 1) % testData.length];
        
        // Add some variations to test names (e.g., different panels, specific assays)
        let testName = testInfo.name;
        if (i % 10 === 0 && testInfo.type === 'Chemistry') {
            testName = `Comprehensive Metabolic Panel - ${testInfo.name}`;
        } else if (i % 15 === 0 && testInfo.type === 'Hematology') {
            testName = `CBC with Differential - ${testInfo.name}`;
        } else if (i % 20 === 0) {
            testName = `${testInfo.name} (Stat)`;
        }
        
        tests.push([
            i,
            testName,
            testInfo.type,
            testInfo.method,
            testInfo.unit,
            testInfo.range
        ]);
    }
    
    return tests;
}

// Generate results data (~1000 records)
export function getResultsData() {
    const statuses = ['pending', 'completed', 'preliminary', 'final', 'corrected', 'cancelled'];
    
    const results = [];
    const baseDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');
    
    // Generate results that link to samples (1-1000) and tests (1-1000)
    // Multiple results can exist for same sample/test combination
    // Create more realistic distribution - some samples have multiple tests
    for (let i = 1; i <= 1000; i++) {
        const resultId = i;
        
        // Distribute samples more realistically - some samples have more tests
        // Use weighted distribution where earlier samples are more likely
        const sampleId = Math.min(1000, Math.floor(Math.pow(Math.random(), 0.7) * 1000) + 1);
        const testId = randomInt(1, 1000);
        
        // Generate realistic result values based on test type patterns
        // Vary by test ID to simulate different test types
        let resultValue;
        const testMod = testId % 100;
        
        if (testMod < 15) {
            // Hematology - cell counts (WBC, RBC, platelets)
            resultValue = randomInt(2000, 15000);
        } else if (testMod < 30) {
            // Chemistry - mg/dL values (glucose, cholesterol, etc.)
            resultValue = randomFloat(50, 300);
        } else if (testMod < 45) {
            // Percentage values (hematocrit, differential counts)
            resultValue = randomFloat(15, 65);
        } else if (testMod < 60) {
            // Enzyme values U/L (ALT, AST, etc.)
            resultValue = randomFloat(10, 200);
        } else if (testMod < 75) {
            // Hormone values (TSH, hormones in pg/mL or mIU/L)
            resultValue = randomFloat(0.5, 50);
        } else if (testMod < 85) {
            // Tumor markers and very sensitive assays (ng/mL)
            resultValue = randomFloat(0.1, 25);
        } else {
            // Very small values (troponin, BNP, etc.)
            resultValue = randomFloat(0.01, 5);
        }
        
        // Some results should be "negative" or "normal" text values for qualitative tests
        if (testMod > 80 && Math.random() < 0.3) {
            const qualitativeValues = ['Negative', 'Positive', 'Normal', 'Abnormal', 'Not Detected', 'Detected'];
            resultValue = randomChoice(qualitativeValues);
        }
        
        const resultDate = randomDate(baseDate, endDate);
        const technicianId = randomInt(1, 50); // 50 technicians
        const status = randomChoice(statuses);
        
        results.push([
            resultId,
            sampleId,
            testId,
            resultValue,
            resultDate,
            technicianId,
            status
        ]);
    }
    
    return results;
}

// Store the data
let samplesData = null;
let testsData = null;
let resultsData = null;

// Lazy load the data (generate once, return cached)
export function getTableData(tableName) {
    const tableLower = tableName.toLowerCase();
    
    if (tableLower === 'samples') {
        if (!samplesData) {
            samplesData = getSamplesData();
        }
        return samplesData;
    } else if (tableLower === 'tests' || tableLower === 'test_types') {
        if (!testsData) {
            testsData = getTestsData();
        }
        return testsData;
    } else if (tableLower === 'results') {
        if (!resultsData) {
            resultsData = getResultsData();
        }
        return resultsData;
    }
    
    return null;
}

