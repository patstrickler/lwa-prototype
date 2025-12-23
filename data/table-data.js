// Pre-populated table data for samples, tests, and results
// Contains ~1000 records each with realistic pharmaceutical company data

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
    const studyCodes = ['PHARMA-2023-001', 'PHARMA-2023-002', 'PHARMA-2023-003', 'PHARMA-2024-001', 
                        'PHARMA-2024-002', 'PHARMA-2024-003', 'CLIN-2023-A', 'CLIN-2023-B', 
                        'CLIN-2024-A', 'BIO-2023-001', 'PK-2024-001', 'PD-2024-002'];
    
    const sampleTypes = [
        'Whole Blood', 'Plasma', 'Serum', 'Urine', 'CSF', 'Tissue', 'Buccal Swab',
        'Plasma EDTA', 'Plasma Heparin', 'Serum Separator', 'Dried Blood Spot', 'Saliva',
        'PK Sample', 'PD Sample', 'Biomarker Sample', 'Safety Sample', 'Efficacy Sample'
    ];
    
    const statuses = ['In Progress', 'Pending Review', 'Completed', 'Rejected', 'On Hold', 
                      'Quality Control', 'Received', 'Processing', 'Released', 'Storage'];
    
    const sites = ['Site 101', 'Site 102', 'Site 103', 'Site 201', 'Site 202', 'Site 301', 
                   'Central Lab', 'Bioanalytical Lab', 'Clinical Lab'];
    
    const samples = [];
    const baseDate = new Date('2023-01-15');
    const endDate = new Date('2024-12-15');
    
    // Generate unique, varied sample IDs (using a shuffled range)
    const sampleIdPool = Array.from({ length: 1000 }, (_, i) => i + 1);
    // Shuffle for more variation
    for (let i = sampleIdPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sampleIdPool[i], sampleIdPool[j]] = [sampleIdPool[j], sampleIdPool[i]];
    }
    
    for (let i = 0; i < 1000; i++) {
        const sampleId = sampleIdPool[i];
        const studyCode = randomChoice(studyCodes);
        const subjectId = randomInt(1001, 1500);
        const visit = `V${randomInt(1, 12)}`;
        const timePoint = randomChoice(['Pre-dose', '1hr', '2hr', '4hr', '6hr', '8hr', '12hr', '24hr', '48hr', 'Baseline']);
        const sampleType = randomChoice(sampleTypes);
        const aliquot = randomChoice(['A', 'B', 'C', 'D', '']);
        
        // Create realistic sample name: STUDY-SUBJECT-VISIT-TIMEPOINT-TYPE-ALIQUOT
        const sampleName = aliquot 
            ? `${studyCode}-${subjectId}-${visit}-${timePoint}-${sampleType}-${aliquot}`
            : `${studyCode}-${subjectId}-${visit}-${timePoint}-${sampleType}`;
        
        const collectionDate = randomDate(baseDate, endDate);
        const status = randomChoice(statuses);
        const labId = randomInt(1, 1000); // 1000 different labs
        
        samples.push([sampleId, sampleName, sampleType, collectionDate, status, labId]);
    }
    
    return samples;
}

// Generate tests data (~1000 records)
export function getTestsData() {
    const testData = [
        // Pharmacokinetics (PK) Tests
        { name: 'Drug Concentration (Plasma)', type: 'Pharmacokinetics', method: 'LC-MS/MS', unit: 'ng/mL', range: '1-5000' },
        { name: 'Drug Concentration (Serum)', type: 'Pharmacokinetics', method: 'LC-MS/MS', unit: 'ng/mL', range: '1-5000' },
        { name: 'Active Metabolite M1', type: 'Pharmacokinetics', method: 'LC-MS/MS', unit: 'ng/mL', range: '0.5-2500' },
        { name: 'Active Metabolite M2', type: 'Pharmacokinetics', method: 'LC-MS/MS', unit: 'ng/mL', range: '0.5-2500' },
        { name: 'Total Drug (Parent + Metabolites)', type: 'Pharmacokinetics', method: 'LC-MS/MS', unit: 'ng/mL', range: '2-7500' },
        { name: 'Free Drug Fraction', type: 'Pharmacokinetics', method: 'Ultrafiltration LC-MS/MS', unit: '%', range: '0.1-10' },
        { name: 'Protein Binding', type: 'Pharmacokinetics', method: 'Equilibrium Dialysis', unit: '%', range: '85-99' },
        { name: 'Cmax Estimation', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'ng/mL', range: '10-10000' },
        { name: 'AUC0-24 Calculation', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'ng·hr/mL', range: '100-500000' },
        { name: 'Tmax Determination', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'hours', range: '0.5-24' },
        { name: 'Half-life (t1/2)', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'hours', range: '2-72' },
        { name: 'Clearance Rate (CL)', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'L/hr', range: '0.5-50' },
        { name: 'Volume of Distribution (Vd)', type: 'Pharmacokinetics', method: 'Non-compartmental Analysis', unit: 'L', range: '10-500' },
        
        // Pharmacodynamics (PD) Tests
        { name: 'Target Engagement', type: 'Pharmacodynamics', method: 'Binding Assay', unit: '%', range: '0-100' },
        { name: 'Receptor Occupancy', type: 'Pharmacodynamics', method: 'Flow Cytometry', unit: '%', range: '0-100' },
        { name: 'Enzyme Activity Inhibition', type: 'Pharmacodynamics', method: 'Enzymatic Assay', unit: '%', range: '0-100' },
        { name: 'Pathway Modulation', type: 'Pharmacodynamics', method: 'Western Blot', unit: 'fold change', range: '0.1-10' },
        { name: 'Gene Expression Analysis', type: 'Pharmacodynamics', method: 'qRT-PCR', unit: 'fold change', range: '0.1-20' },
        { name: 'Protein Phosphorylation', type: 'Pharmacodynamics', method: 'ELISA', unit: 'pg/mL', range: '10-10000' },
        { name: 'Cytokine Level (IL-6)', type: 'Pharmacodynamics', method: 'Multiplex ELISA', unit: 'pg/mL', range: '0.1-500' },
        { name: 'Cytokine Level (TNF-α)', type: 'Pharmacodynamics', method: 'Multiplex ELISA', unit: 'pg/mL', range: '0.1-300' },
        { name: 'Cytokine Level (IL-1β)', type: 'Pharmacodynamics', method: 'Multiplex ELISA', unit: 'pg/mL', range: '0.1-200' },
        { name: 'Biomarker Panel (Inflammation)', type: 'Pharmacodynamics', method: 'Multiplex Assay', unit: 'AU', range: '0-1000' },
        
        // Biomarker Tests
        { name: 'Troponin I (Cardiac)', type: 'Biomarker', method: 'Chemiluminescence', unit: 'ng/mL', range: '<0.04' },
        { name: 'BNP (Brain Natriuretic Peptide)', type: 'Biomarker', method: 'Chemiluminescence', unit: 'pg/mL', range: '<100' },
        { name: 'CRP (C-Reactive Protein)', type: 'Biomarker', method: 'Nephelometry', unit: 'mg/L', range: '<3.0' },
        { name: 'Procalcitonin', type: 'Biomarker', method: 'Chemiluminescence', unit: 'ng/mL', range: '<0.25' },
        { name: 'NT-proBNP', type: 'Biomarker', method: 'Electrochemiluminescence', unit: 'pg/mL', range: '<125' },
        { name: 'Troponin T', type: 'Biomarker', method: 'Electrochemiluminescence', unit: 'ng/L', range: '<14' },
        { name: 'CK-MB (Creatine Kinase-MB)', type: 'Biomarker', method: 'Chemiluminescence', unit: 'ng/mL', range: '<5.0' },
        { name: 'Myoglobin', type: 'Biomarker', method: 'Chemiluminescence', unit: 'ng/mL', range: '<107' },
        
        // Safety Tests - Hematology
        { name: 'Complete Blood Count (CBC)', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: 'cells/μL', range: '4500-11000' },
        { name: 'Hemoglobin', type: 'Safety - Hematology', method: 'Spectrophotometry', unit: 'g/dL', range: '12.0-17.5' },
        { name: 'Hematocrit', type: 'Safety - Hematology', method: 'Centrifugation', unit: '%', range: '36.0-52.0' },
        { name: 'White Blood Cell Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: 'cells/μL', range: '4000-11000' },
        { name: 'Red Blood Cell Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: 'million/μL', range: '4.5-5.9' },
        { name: 'Platelet Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: 'platelets/μL', range: '150000-450000' },
        { name: 'Mean Corpuscular Volume (MCV)', type: 'Safety - Hematology', method: 'Calculated', unit: 'fL', range: '80-100' },
        { name: 'Mean Corpuscular Hemoglobin (MCH)', type: 'Safety - Hematology', method: 'Calculated', unit: 'pg', range: '27-31' },
        { name: 'Mean Corpuscular Hemoglobin Concentration (MCHC)', type: 'Safety - Hematology', method: 'Calculated', unit: 'g/dL', range: '32-36' },
        { name: 'Red Cell Distribution Width (RDW)', type: 'Safety - Hematology', method: 'Calculated', unit: '%', range: '11.5-14.5' },
        { name: 'Neutrophil Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: '%', range: '40-70' },
        { name: 'Lymphocyte Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: '%', range: '20-45' },
        { name: 'Monocyte Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: '%', range: '2-10' },
        { name: 'Eosinophil Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: '%', range: '0-6' },
        { name: 'Basophil Count', type: 'Safety - Hematology', method: 'Flow Cytometry', unit: '%', range: '0-2' },
        
        // Safety Tests - Chemistry
        { name: 'Alanine Aminotransferase (ALT)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '7-56' },
        { name: 'Aspartate Aminotransferase (AST)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '10-40' },
        { name: 'Alkaline Phosphatase (ALP)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '44-147' },
        { name: 'Total Bilirubin', type: 'Safety - Chemistry', method: 'Diazo', unit: 'mg/dL', range: '0.3-1.2' },
        { name: 'Direct Bilirubin', type: 'Safety - Chemistry', method: 'Diazo', unit: 'mg/dL', range: '0.0-0.3' },
        { name: 'Indirect Bilirubin', type: 'Safety - Chemistry', method: 'Calculated', unit: 'mg/dL', range: '0.2-1.0' },
        { name: 'Total Protein', type: 'Safety - Chemistry', method: 'Biuret', unit: 'g/dL', range: '6.0-8.3' },
        { name: 'Albumin', type: 'Safety - Chemistry', method: 'Bromocresol Green', unit: 'g/dL', range: '3.5-5.0' },
        { name: 'Globulin', type: 'Safety - Chemistry', method: 'Calculated', unit: 'g/dL', range: '2.0-3.5' },
        { name: 'A/G Ratio', type: 'Safety - Chemistry', method: 'Calculated', unit: 'ratio', range: '1.0-2.5' },
        { name: 'Blood Urea Nitrogen (BUN)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '7-20' },
        { name: 'Creatinine', type: 'Safety - Chemistry', method: 'Jaffé Reaction', unit: 'mg/dL', range: '0.6-1.2' },
        { name: 'eGFR', type: 'Safety - Chemistry', method: 'Calculated (CKD-EPI)', unit: 'mL/min/1.73m²', range: '>60' },
        { name: 'Glucose (Fasting)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '70-100' },
        { name: 'Total Cholesterol', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '<200' },
        { name: 'HDL Cholesterol', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '>40' },
        { name: 'LDL Cholesterol', type: 'Safety - Chemistry', method: 'Calculated', unit: 'mg/dL', range: '<100' },
        { name: 'Triglycerides', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '<150' },
        { name: 'Sodium', type: 'Safety - Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '136-145' },
        { name: 'Potassium', type: 'Safety - Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '3.5-5.0' },
        { name: 'Chloride', type: 'Safety - Chemistry', method: 'Ion Selective Electrode', unit: 'mEq/L', range: '98-107' },
        { name: 'Carbon Dioxide', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mEq/L', range: '22-29' },
        { name: 'Calcium', type: 'Safety - Chemistry', method: 'Atomic Absorption', unit: 'mg/dL', range: '8.5-10.5' },
        { name: 'Phosphorus', type: 'Safety - Chemistry', method: 'Colorimetric', unit: 'mg/dL', range: '2.5-4.5' },
        { name: 'Magnesium', type: 'Safety - Chemistry', method: 'Colorimetric', unit: 'mg/dL', range: '1.7-2.2' },
        { name: 'Lactate Dehydrogenase (LDH)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '140-280' },
        { name: 'Creatine Kinase (CK)', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '30-200' },
        { name: 'Uric Acid', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'mg/dL', range: '3.5-7.2' },
        { name: 'Amylase', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '30-110' },
        { name: 'Lipase', type: 'Safety - Chemistry', method: 'Enzymatic', unit: 'U/L', range: '13-60' },
        
        // Coagulation Tests
        { name: 'Prothrombin Time (PT)', type: 'Coagulation', method: 'Clotting Assay', unit: 'seconds', range: '11-13.5' },
        { name: 'INR', type: 'Coagulation', method: 'Calculated', unit: 'ratio', range: '0.9-1.1' },
        { name: 'Partial Thromboplastin Time (PTT)', type: 'Coagulation', method: 'Clotting Assay', unit: 'seconds', range: '25-35' },
        { name: 'Activated Partial Thromboplastin Time (aPTT)', type: 'Coagulation', method: 'Clotting Assay', unit: 'seconds', range: '25-35' },
        { name: 'D-Dimer', type: 'Coagulation', method: 'Immunoassay', unit: 'μg/mL', range: '<0.5' },
        { name: 'Fibrinogen', type: 'Coagulation', method: 'Clotting Assay', unit: 'mg/dL', range: '200-400' },
        { name: 'Antithrombin III', type: 'Coagulation', method: 'Chromogenic', unit: '%', range: '80-120' },
        { name: 'Protein C', type: 'Coagulation', method: 'Chromogenic', unit: '%', range: '70-130' },
        { name: 'Protein S', type: 'Coagulation', method: 'Chromogenic', unit: '%', range: '70-140' },
        
        // Immunogenicity Tests
        { name: 'Anti-Drug Antibodies (ADA)', type: 'Immunogenicity', method: 'Electrochemiluminescence', unit: 'ng/mL', range: '<100' },
        { name: 'Neutralizing Antibodies (NAb)', type: 'Immunogenicity', method: 'Cell-Based Assay', unit: 'titer', range: '<1:100' },
        { name: 'IgG Anti-Drug', type: 'Immunogenicity', method: 'ELISA', unit: 'AU/mL', range: '<50' },
        { name: 'IgM Anti-Drug', type: 'Immunogenicity', method: 'ELISA', unit: 'AU/mL', range: '<50' },
        { name: 'IgE Anti-Drug', type: 'Immunogenicity', method: 'ELISA', unit: 'kU/L', range: '<0.35' },
        
        // Cytokine and Immune Markers
        { name: 'Interleukin-6 (IL-6)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<3.0' },
        { name: 'Tumor Necrosis Factor-α (TNF-α)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<15.6' },
        { name: 'Interleukin-1β (IL-1β)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<3.9' },
        { name: 'Interferon-γ (IFN-γ)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<15.6' },
        { name: 'Interleukin-10 (IL-10)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<9.1' },
        { name: 'Interleukin-8 (IL-8)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<62.5' },
        { name: 'Interleukin-2 (IL-2)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<31.2' },
        { name: 'Interleukin-4 (IL-4)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<31.2' },
        { name: 'Interleukin-12 (IL-12)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<187.5' },
        { name: 'Interleukin-17 (IL-17)', type: 'Immunology', method: 'Multiplex ELISA', unit: 'pg/mL', range: '<31.2' },
        
        // Hormone and Endocrine Tests
        { name: 'TSH', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'mIU/L', range: '0.4-4.0' },
        { name: 'Free T4', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'ng/dL', range: '0.8-1.8' },
        { name: 'Free T3', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'pg/mL', range: '2.3-4.2' },
        { name: 'Cortisol (AM)', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'μg/dL', range: '5-25' },
        { name: 'Cortisol (PM)', type: 'Endocrinology', method: 'Chemiluminescence', unit: 'μg/dL', range: '2-14' },
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
        
        // Urinalysis
        { name: 'Urinalysis - pH', type: 'Urinalysis', method: 'Dipstick', unit: 'pH', range: '5.0-8.0' },
        { name: 'Urinalysis - Specific Gravity', type: 'Urinalysis', method: 'Refractometry', unit: 'SG', range: '1.005-1.030' },
        { name: 'Urinalysis - Protein', type: 'Urinalysis', method: 'Dipstick', unit: 'mg/dL', range: '<30' },
        { name: 'Urinalysis - Glucose', type: 'Urinalysis', method: 'Dipstick', unit: 'mg/dL', range: 'Negative' },
        { name: 'Urinalysis - Blood', type: 'Urinalysis', method: 'Dipstick', unit: 'RBC/HPF', range: '0-3' },
        { name: 'Urinalysis - Leukocytes', type: 'Urinalysis', method: 'Dipstick', unit: 'WBC/HPF', range: '0-5' },
        { name: 'Urinalysis - Nitrite', type: 'Urinalysis', method: 'Dipstick', unit: 'N/A', range: 'Negative' },
        { name: 'Urinalysis - Bilirubin', type: 'Urinalysis', method: 'Dipstick', unit: 'N/A', range: 'Negative' },
        { name: 'Urinalysis - Urobilinogen', type: 'Urinalysis', method: 'Dipstick', unit: 'mg/dL', range: '0.1-1.0' },
        { name: 'Urinalysis - Ketones', type: 'Urinalysis', method: 'Dipstick', unit: 'mg/dL', range: 'Negative' },
        { name: 'Urinalysis - Microscopic', type: 'Urinalysis', method: 'Microscopy', unit: 'N/A', range: 'Negative' },
        
        // Other Common Tests
        { name: 'Vitamin D (25-OH)', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '30-100' },
        { name: 'Vitamin B12', type: 'Nutrition', method: 'Chemiluminescence', unit: 'pg/mL', range: '200-900' },
        { name: 'Folate', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '>4.0' },
        { name: 'Iron', type: 'Nutrition', method: 'Colorimetric', unit: 'μg/dL', range: '60-170' },
        { name: 'TIBC', type: 'Nutrition', method: 'Colorimetric', unit: 'μg/dL', range: '250-450' },
        { name: 'Ferritin', type: 'Nutrition', method: 'Chemiluminescence', unit: 'ng/mL', range: '15-200' },
        { name: 'Transferrin', type: 'Nutrition', method: 'Nephelometry', unit: 'mg/dL', range: '200-360' },
        { name: 'Transferrin Saturation', type: 'Nutrition', method: 'Calculated', unit: '%', range: '20-50' },
    ];
    
    const tests = [];
    
    // Generate unique, varied test IDs (using a shuffled range)
    const testIdPool = Array.from({ length: 1000 }, (_, i) => i + 1);
    // Shuffle for more variation
    for (let i = testIdPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [testIdPool[i], testIdPool[j]] = [testIdPool[j], testIdPool[i]];
    }
    
    // Generate ~1000 test records by cycling through and adding variations
    for (let i = 0; i < 1000; i++) {
        const testId = testIdPool[i];
        const testInfo = testData[i % testData.length];
        
        // Add some variations to test names (study-specific, lot numbers, etc.)
        let testName = testInfo.name;
        const variation = i % 100;
        
        if (variation === 0 && (testInfo.type === 'Pharmacokinetics' || testInfo.type === 'Pharmacodynamics')) {
            testName = `${testInfo.name} (Study-Specific)`;
        } else if (variation === 1 && testInfo.method.includes('LC-MS')) {
            testName = `${testInfo.name} (Validated Method)`;
        } else if (variation === 2) {
            testName = `${testInfo.name} (Batch ${String(Math.floor(i / 50) + 1).padStart(3, '0')})`;
        }
        
        tests.push([
            testId,
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
    const statuses = ['Pending', 'In Progress', 'Completed', 'Reviewed', 'Released', 
                      'Under Review', 'Quality Control', 'Needs Verification', 'Approved', 'Rejected'];
    
    const results = [];
    const baseDate = new Date('2023-01-20');
    const endDate = new Date('2024-12-10');
    
    // Generate unique, varied result IDs (using a shuffled range)
    const resultIdPool = Array.from({ length: 1000 }, (_, i) => i + 1);
    // Shuffle for more variation
    for (let i = resultIdPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultIdPool[i], resultIdPool[j]] = [resultIdPool[j], resultIdPool[i]];
    }
    
    // Create pools of valid sample_ids and test_ids for better distribution
    const validSampleIds = Array.from({ length: 1000 }, (_, i) => i + 1);
    const validTestIds = Array.from({ length: 1000 }, (_, i) => i + 1);
    
    // Generate results that link to samples (1-1000) and tests (1-1000)
    for (let i = 0; i < 1000; i++) {
        const resultId = resultIdPool[i];
        
        // Distribute samples more realistically - some samples have more tests
        // Use weighted distribution where earlier samples are more likely
        const sampleId = validSampleIds[Math.min(999, Math.floor(Math.pow(Math.random(), 0.7) * 1000))];
        const testId = validTestIds[randomInt(0, 999)];
        
        // Determine result value based on test category (using modulo to cycle through test types)
        // Since tests cycle through the testData array, use modulo to determine category
        const testIndex = (testId - 1) % 140; // There are ~140 unique test types
        
        let resultValue;
        
        // PK tests (indices 0-12)
        if (testIndex < 13) {
            resultValue = randomFloat(5, 4500); // ng/mL range for drug concentrations
        }
        // PD tests (indices 13-22)
        else if (testIndex < 23) {
            resultValue = randomFloat(0, 100); // Percentages or fold changes
        }
        // Biomarker tests (indices 23-30)
        else if (testIndex < 31) {
            resultValue = randomFloat(0.05, 450); // Various biomarker ranges
        }
        // Safety Hematology (indices 31-45)
        else if (testIndex < 46) {
            resultValue = randomInt(1500, 18000); // Cell counts
        }
        // Safety Chemistry (indices 46-81)
        else if (testIndex < 82) {
            resultValue = randomFloat(0.2, 480); // Various chemistry ranges
        }
        // Coagulation (indices 82-90)
        else if (testIndex < 91) {
            resultValue = randomFloat(12, 48); // Coagulation times and percentages
        }
        // Immunogenicity (indices 91-95)
        else if (testIndex < 96) {
            resultValue = randomFloat(0, 450); // Antibody levels
        }
        // Immunology/Cytokines (indices 96-105)
        else if (testIndex < 106) {
            resultValue = randomFloat(0.2, 950); // pg/mL for cytokines
        }
        // Endocrinology (indices 106-120)
        else if (testIndex < 121) {
            resultValue = randomFloat(0.2, 950); // Hormone levels
        }
        // Urinalysis (indices 121-131) - can be qualitative or quantitative
        else if (testIndex < 132) {
            if (Math.random() < 0.25) {
                const qualitativeValues = ['Negative', 'Positive', 'Trace', 'Small', 'Moderate', 'Large', 'Normal', 'Abnormal'];
                resultValue = randomChoice(qualitativeValues);
            } else {
                resultValue = randomFloat(0, 95);
            }
        }
        // Nutrition (indices 132-139)
        else {
            resultValue = randomFloat(2, 950); // Vitamin and mineral levels
        }
        
        // Format numeric values appropriately
        if (typeof resultValue === 'number') {
            if (resultValue >= 1000) {
                resultValue = Math.round(resultValue);
            } else if (resultValue >= 100) {
                resultValue = parseFloat(resultValue.toFixed(1));
            } else if (resultValue >= 10) {
                resultValue = parseFloat(resultValue.toFixed(2));
            } else {
                resultValue = parseFloat(resultValue.toFixed(3));
            }
        }
        
        const resultDate = randomDate(baseDate, endDate);
        const technicianId = randomInt(1, 1000); // 1000 technicians across different labs
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

// Generate labs data (~1000 records)
export function getLabsData() {
    const labTypes = [
        'Central Laboratory', 'Clinical Research Lab', 'Bioanalytical Laboratory', 
        'Clinical Trial Lab', 'Reference Laboratory', 'Specialty Lab', 
        'Clinical Chemistry Lab', 'Hematology Lab', 'Microbiology Lab',
        'Molecular Diagnostics Lab', 'Immunology Lab', 'Pharmacokinetics Lab',
        'Biomarker Laboratory', 'Safety Laboratory', 'Quality Control Lab'
    ];
    
    const cities = [
        'Boston', 'New York', 'Philadelphia', 'Baltimore', 'Washington', 'Atlanta',
        'Miami', 'Chicago', 'Detroit', 'Minneapolis', 'Dallas', 'Houston',
        'Phoenix', 'Los Angeles', 'San Diego', 'San Francisco', 'Seattle',
        'Denver', 'Kansas City', 'Indianapolis', 'Cleveland', 'Pittsburgh',
        'Charlotte', 'Nashville', 'Memphis', 'New Orleans', 'Portland',
        'Salt Lake City', 'Las Vegas', 'Austin', 'Raleigh', 'Columbus'
    ];
    
    const states = [
        'MA', 'NY', 'PA', 'MD', 'DC', 'GA', 'FL', 'IL', 'MI', 'MN',
        'TX', 'AZ', 'CA', 'WA', 'CO', 'MO', 'IN', 'OH', 'NC', 'TN',
        'LA', 'OR', 'UT', 'NV', 'NC', 'OH'
    ];
    
    const labs = [];
    
    for (let i = 1; i <= 1000; i++) {
        const labId = i;
        const labType = randomChoice(labTypes);
        const city = randomChoice(cities);
        const state = randomChoice(states);
        const location = `${city}, ${state}`;
        
        // Create realistic lab names
        const labName = i % 20 === 0 
            ? `${labType} - ${city}`
            : i % 15 === 0
            ? `${city} ${labType}`
            : `${labType} ${String(i).padStart(3, '0')}`;
        
        // Generate email
        const labCode = labName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
        const contactEmail = `contact@${labCode}.lab.com`;
        
        // Generate phone number
        const areaCode = randomInt(200, 999);
        const exchange = randomInt(200, 999);
        const number = randomInt(1000, 9999);
        const phone = `${areaCode}-${exchange}-${number}`;
        
        labs.push([labId, labName, location, contactEmail, phone]);
    }
    
    return labs;
}

// Generate technicians data (~1000 records)
export function getTechniciansData() {
    const firstNames = [
        'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
        'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
        'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
        'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
        'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
        'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
        'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
        'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
        'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
        'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
        'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Frank', 'Christine', 'Gregory', 'Debra',
        'Raymond', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
        'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Julie',
        'Jose', 'Joyce', 'Henry', 'Victoria', 'Adam', 'Kelly', 'Douglas', 'Christina',
        'Nathan', 'Joan', 'Peter', 'Evelyn', 'Zachary', 'Lauren', 'Kyle', 'Judith',
        'Noah', 'Megan', 'Ethan', 'Cheryl', 'Jeremy', 'Andrea', 'Walter', 'Hannah',
        'Christian', 'Jacqueline', 'Keith', 'Martha', 'Roger', 'Gloria', 'Terry', 'Teresa',
        'Austin', 'Sara', 'Sean', 'Janice', 'Gerald', 'Marie', 'Carl', 'Julia',
        'Harold', 'Grace', 'Dylan', 'Judy', 'Jesse', 'Theresa', 'Jordan', 'Madison',
        'Bryan', 'Beverly', 'Billy', 'Denise', 'Joe', 'Marilyn', 'Bruce', 'Amber',
        'Albert', 'Danielle', 'Willie', 'Rose', 'Gabriel', 'Brittany', 'Logan', 'Diana',
        'Alan', 'Abigail', 'Juan', 'Jane', 'Wayne', 'Lori', 'Roy', 'Olivia',
        'Ralph', 'Jean', 'Eugene', 'Frances', 'Louis', 'Kathryn', 'Philip', 'Alice',
        'Johnny', 'Jesse', 'Bobby', 'Geraldine', 'Howard', 'Marie', 'Randy', 'Jacqueline'
    ];
    
    const lastNames = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
        'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
        'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
        'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
        'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
        'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
        'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers',
        'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly',
        'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
        'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
        'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross',
        'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell',
        'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons',
        'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham', 'Reynolds', 'Griffin',
        'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant', 'Herrera', 'Gibson',
        'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray', 'Ford', 'Castro',
        'Marshall', 'Owens', 'Harrison', 'Fernandez', 'Mcdonald', 'Woods', 'Washington', 'Kennedy',
        'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb', 'Tucker', 'Guzman',
        'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter', 'Gordon', 'Mendez',
        'Silva', 'Shaw', 'Snyder', 'Mason', 'Dixon', 'Munoz', 'Hunt', 'Hicks',
        'Holmes', 'Palmer', 'Wagner', 'Black', 'Robertson', 'Boyd', 'Rose', 'Stone',
        'Salazar', 'Fox', 'Warren', 'Mills', 'Meyer', 'Rice', 'Schmidt', 'Garza',
        'Daniels', 'Ferguson', 'Nichols', 'Stephens', 'Soto', 'Weaver', 'Ryan', 'Gardner',
        'Payne', 'Grant', 'Dunn', 'Kelley', 'Spencer', 'Hawkins', 'Arnold', 'Pierce',
        'Vazquez', 'Hansen', 'Peters', 'Santos', 'Hart', 'Bradley', 'Knight', 'Elliott',
        'Cunningham', 'Duncan', 'Armstrong', 'Hudson', 'Carroll', 'Lane', 'Riley', 'Andrews',
        'Alvarado', 'Ray', 'Delgado', 'Berry', 'Perkins', 'Hoffman', 'Johnston', 'Matthews',
        'Pena', 'Richards', 'Contreras', 'Willis', 'Carpenter', 'Lawrence', 'Sandoval', 'Guerrero',
        'George', 'Chapman', 'Rios', 'Estrada', 'Ortega', 'Watkins', 'Greene', 'Nunez',
        'Wheeler', 'Valdez', 'Harper', 'Burke', 'Larson', 'Santiago', 'Maldonado', 'Morrison',
        'Franklin', 'Carlson', 'Austin', 'Dominguez', 'Carr', 'Lawson', 'Jacobs', 'Obrien',
        'Lynch', 'Singh', 'Vega', 'Bishop', 'Montgomery', 'Oliver', 'Jensen', 'Harvey',
        'Williamson', 'Gilbert', 'Dean', 'Mason', 'Lowe', 'Fletcher', 'McCarthy', 'May',
        'Fuller', 'Newman', 'Lucas', 'Holland', 'Wong', 'Terry', 'Barber', 'Reid',
        'Horton', 'Reed', 'Schneider', 'Warner', 'Garrett', 'Newton', 'Hodges', 'Potter',
        'Walton', 'Goodwin', 'Mullins', 'Molina', 'Webster', 'Fischer', 'Campos', 'Avila',
        'Sherman', 'Todd', 'Chang', 'Blake', 'Malone', 'Wolf', 'Hodges', 'Juarez',
        'Gill', 'Buck', 'Mcbride', 'Hogan', 'Mcgee', 'Brewer', 'Benson', 'Brock',
        'Hardy', 'Dudley', 'Casey', 'Arnold', 'Mathis', 'Holloway', 'Briggs', 'Peck',
        'Chan', 'Boyle', 'Bentley', 'Allison', 'Baldwin', 'Mcintosh', 'Tran', 'Roach',
        'Horton', 'Serrano', 'Pollard', 'Hodge', 'Lamb', 'Henson', 'Conway', 'Wilkerson',
        'Forbes', 'Good', 'Petty', 'Merritt', 'Keith', 'Morrow', 'Holt', 'Wade',
        'Potts', 'Hurley', 'Hurley', 'Solis', 'Oconnor', 'Pace', 'Hoover', 'Bray',
        'Pham', 'Rojas', 'Camacho', 'Avila', 'Mcdowell', 'Finley', 'Sloan', 'Mayer',
        'Ayers', 'Herman', 'Mckay', 'Bridges', 'Mccann', 'Meadows', 'Walters', 'Rush',
        'Gregory', 'Mueller', 'Rocha', 'Saunders', 'Barr', 'Cantu', 'Mercado', 'Farrell',
        'Tapia', 'Leach', 'York', 'Dickson', 'Hammond', 'Gamble', 'Duffy', 'Blevins',
        'Hobbs', 'Orr', 'Frye', 'Glass', 'Combs', 'Ware', 'Bolton', 'Norris',
        'Oneal', 'Barnett', 'Melton', 'Haney', 'Hayden', 'Sampson', 'Brock', 'Morrow'
    ];
    
    const specializations = [
        'Pharmacokinetics', 'Pharmacodynamics', 'Bioanalytical Chemistry', 'Clinical Chemistry',
        'Hematology', 'Microbiology', 'Immunology', 'Molecular Biology', 'Toxicology',
        'Biomarker Analysis', 'Flow Cytometry', 'LC-MS/MS', 'ELISA', 'PCR',
        'Cell Culture', 'Protein Analysis', 'Enzyme Assays', 'Metabolomics',
        'Quality Control', 'Method Development', 'Data Analysis', 'Sample Preparation',
        'Immunoassay', 'Mass Spectrometry', 'Chromatography', 'Genomics', 'Proteomics',
        'Clinical Trials', 'Regulatory Affairs', 'Laboratory Operations', 'Quality Assurance'
    ];
    
    const technicians = [];
    
    for (let i = 1; i <= 1000; i++) {
        const technicianId = i;
        const firstName = randomChoice(firstNames);
        const lastName = randomChoice(lastNames);
        const name = `${firstName} ${lastName}`;
        
        // Generate email
        const emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.substring(0, 20);
        const email = `${emailBase}@labtech.com`;
        
        // Assign to a lab (1-1000)
        const labId = randomInt(1, 1000);
        
        // Assign specialization
        const specialization = randomChoice(specializations);
        
        technicians.push([technicianId, name, email, labId, specialization]);
    }
    
    return technicians;
}

// Store the data
let samplesData = null;
let testsData = null;
let resultsData = null;
let labsData = null;
let techniciansData = null;

// Lazy load the data (generate once, return cached)
export function getTableData(tableName) {
    const tableLower = tableName.toLowerCase();
    
    if (tableLower === 'samples') {
        if (!samplesData) {
            samplesData = getSamplesData();
        }
        return samplesData;
    } else if (tableLower === 'tests') {
        if (!testsData) {
            testsData = getTestsData();
        }
        return testsData;
    } else if (tableLower === 'results') {
        if (!resultsData) {
            resultsData = getResultsData();
        }
        return resultsData;
    } else if (tableLower === 'labs') {
        if (!labsData) {
            labsData = getLabsData();
        }
        return labsData;
    } else if (tableLower === 'technicians') {
        if (!techniciansData) {
            techniciansData = getTechniciansData();
        }
        return techniciansData;
    }
    
    return null;
}
