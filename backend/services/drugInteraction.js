const Inventory = require('../models/Inventory');

class DrugInteractionChecker {
  // Common drug interactions database (simplified)
  static interactions = {
    'warfarin': {
      dangerous: ['aspirin', 'ibuprofen', 'naproxen'],
      severity: 'severe',
      effect: 'Increased bleeding risk'
    },
    'metformin': {
      dangerous: ['alcohol', 'contrast dye'],
      severity: 'moderate',
      effect: 'Risk of lactic acidosis'
    },
    'lisinopril': {
      dangerous: ['potassium supplements', 'spironolactone'],
      severity: 'moderate',
      effect: 'Hyperkalemia risk'
    },
    'amoxicillin': {
      dangerous: ['methotrexate'],
      severity: 'moderate',
      effect: 'Increased methotrexate toxicity'
    },
    'simvastatin': {
      dangerous: ['clarithromycin', 'erythromycin', 'grapefruit'],
      severity: 'severe',
      effect: 'Increased risk of muscle damage'
    }
  };

  // Check for drug interactions
  static async checkInteractions(medications, existingMedications = []) {
    const warnings = [];
    const allMeds = [...medications, ...existingMedications];

    // Check each medication against others
    for (let i = 0; i < allMeds.length; i++) {
      const med1 = allMeds[i].medicationName.toLowerCase();
      
      for (let j = i + 1; j < allMeds.length; j++) {
        const med2 = allMeds[j].medicationName.toLowerCase();
        
        // Check if interaction exists
        if (this.interactions[med1]?.dangerous.includes(med2)) {
          warnings.push({
            severity: this.interactions[med1].severity,
            description: `${allMeds[i].medicationName} interacts with ${allMeds[j].medicationName}`,
            effect: this.interactions[med1].effect,
            affectedMedications: [allMeds[i].medicationName, allMeds[j].medicationName]
          });
        } else if (this.interactions[med2]?.dangerous.includes(med1)) {
          warnings.push({
            severity: this.interactions[med2].severity,
            description: `${allMeds[j].medicationName} interacts with ${allMeds[i].medicationName}`,
            effect: this.interactions[med2].effect,
            affectedMedications: [allMeds[j].medicationName, allMeds[i].medicationName]
          });
        }
      }
    }

    return warnings;
  }

  // Check medication dosage safety
  static checkDosageSafety(medication, patientAge, patientWeight) {
    const warnings = [];
    
    // Dosage limits by age
    if (patientAge < 18) {
      warnings.push({
        severity: 'moderate',
        description: 'Pediatric dosage adjustment required',
        recommendation: 'Consult pediatric dosing guidelines'
      });
    }

    if (patientAge > 65) {
      warnings.push({
        severity: 'low',
        description: 'Geriatric dosage consideration needed',
        recommendation: 'Consider reduced dosage for elderly patients'
      });
    }

    return warnings;
  }

  // Check allergy conflicts
  static checkAllergies(medications, patientAllergies) {
    const conflicts = [];

    for (const med of medications) {
      const medName = med.medicationName.toLowerCase();
      
      for (const allergy of patientAllergies) {
        if (medName.includes(allergy.toLowerCase()) || 
            allergy.toLowerCase().includes(medName)) {
          conflicts.push({
            severity: 'severe',
            description: `Patient is allergic to ${allergy}`,
            affectedMedication: med.medicationName,
            action: 'DO NOT PRESCRIBE'
          });
        }
      }
    }

    return conflicts;
  }

  // Comprehensive prescription validation
  static async validatePrescription(prescriptionData, patient) {
    const { medications } = prescriptionData;
    const warnings = {
      interactions: [],
      allergies: [],
      dosage: [],
      availability: []
    };

    // Check drug interactions
    warnings.interactions = await this.checkInteractions(
      medications,
      patient.currentMedications || []
    );

    // Check allergies
    if (patient.allergies && patient.allergies.length > 0) {
      warnings.allergies = this.checkAllergies(medications, patient.allergies);
    }

    // Check dosage safety
    for (const med of medications) {
      const dosageWarnings = this.checkDosageSafety(
        med,
        patient.age,
        patient.weight
      );
      warnings.dosage.push(...dosageWarnings);
    }

    // Check medication availability in inventory
    for (const med of medications) {
      const inventoryItem = await Inventory.findOne({
        itemName: { $regex: new RegExp(med.medicationName, 'i') },
        category: 'medicine',
        status: 'available'
      });

      if (!inventoryItem) {
        warnings.availability.push({
          severity: 'high',
          description: `${med.medicationName} not available in inventory`,
          action: 'Order required or find alternative'
        });
      } else if (inventoryItem.quantity < 10) {
        warnings.availability.push({
          severity: 'moderate',
          description: `Low stock: ${med.medicationName}`,
          currentQuantity: inventoryItem.quantity
        });
      }
    }

    return warnings;
  }
}

module.exports = DrugInteractionChecker;
