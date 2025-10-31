const Ward = require('../models/Ward');
const Patient = require('../models/Patient');

class WardAllocation {
  // AI-based ward allocation considering multiple factors
  static async allocateWard(patientId) {
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Get available wards
    const wards = await Ward.find({
      status: 'active',
      availableBeds: { $gt: 0 }
    }).populate('patients.patientId');

    // Score each ward based on compatibility
    const scoredWards = await Promise.all(
      wards.map(async ward => ({
        ward,
        score: await this.calculateCompatibilityScore(ward, patient)
      }))
    );

    // Sort by score and select best match
    scoredWards.sort((a, b) => b.score - a.score);

    if (scoredWards.length === 0) {
      return null;
    }

    const bestWard = scoredWards[0].ward;

    // Assign patient to ward
    const bedNumber = `B${bestWard.occupiedBeds + 1}`;
    
    bestWard.patients.push({
      patientId: patient._id,
      bedNumber,
      admissionDate: new Date(),
      expectedDischargeDate: this.estimateDischargeDate(patient)
    });

    await bestWard.save();

    patient.assignedWard = bestWard._id;
    await patient.save();

    return {
      ward: bestWard,
      bedNumber
    };
  }

  // Calculate ward compatibility score
  static async calculateCompatibilityScore(ward, patient) {
    let score = 100;

    // Gender preference matching
    if (ward.genderPreference !== 'mixed') {
      if (ward.genderPreference === patient.gender.toLowerCase()) {
        score += 20;
      } else {
        score -= 30;
      }
    }

    // Age-based grouping
    const patientAge = patient.age;
    const wardPatients = await Patient.find({
      _id: { $in: ward.patients.map(p => p.patientId) }
    });

    if (wardPatients.length > 0) {
      const avgAge = wardPatients.reduce((sum, p) => sum + p.age, 0) / wardPatients.length;
      const ageDiff = Math.abs(avgAge - patientAge);
      
      if (ageDiff < 10) {
        score += 15;
      } else if (ageDiff > 30) {
        score -= 10;
      }
    }

    // Ward type matching
    if (ward.wardType === 'pediatric' && patientAge < 18) {
      score += 25;
    } else if (ward.wardType === 'general' && patientAge >= 18) {
      score += 10;
    }

    // Medical compatibility (isolation for infectious diseases)
    if (patient.medicalHistory) {
      const hasInfectiousCondition = patient.medicalHistory.some(h => 
        ['tuberculosis', 'covid', 'hepatitis', 'measles'].some(disease => 
          h.condition.toLowerCase().includes(disease)
        )
      );

      if (hasInfectiousCondition) {
        if (ward.wardType === 'isolation') {
          score += 50;
        } else {
          score -= 100; // Cannot assign to non-isolation ward
        }
      }
    }

    // Occupancy rate (prefer wards with balanced occupancy)
    const occupancyRate = ward.occupiedBeds / ward.totalBeds;
    if (occupancyRate < 0.8 && occupancyRate > 0.3) {
      score += 10;
    }

    // Facility matching
    if (patient.currentMedications && patient.currentMedications.length > 5) {
      if (ward.facilities.includes('ICU equipment')) {
        score += 15;
      }
    }

    // Floor preference (lower floors for elderly or mobility issues)
    if (patientAge > 65 && ward.floor <= 2) {
      score += 10;
    }

    return Math.max(0, score);
  }

  // Estimate discharge date based on condition
  static estimateDischargeDate(patient) {
    const avgStayDays = {
      'active': 7,
      'chronic': 14,
      'resolved': 3
    };

    let estimatedDays = 7; // Default

    if (patient.medicalHistory && patient.medicalHistory.length > 0) {
      const latestCondition = patient.medicalHistory[patient.medicalHistory.length - 1];
      estimatedDays = avgStayDays[latestCondition.status] || 7;
    }

    const dischargeDate = new Date();
    dischargeDate.setDate(dischargeDate.getDate() + estimatedDays);
    
    return dischargeDate;
  }

  // Suggest ward transfers for better optimization
  static async suggestWardTransfers() {
    const wards = await Ward.find({ status: 'active' }).populate('patients.patientId');
    const suggestions = [];

    for (const ward of wards) {
      for (const wardPatient of ward.patients) {
        const patient = wardPatient.patientId;
        
        if (patient) {
          const currentScore = await this.calculateCompatibilityScore(ward, patient);
          
          // Check if other wards have better compatibility
          const otherWards = wards.filter(w => w._id.toString() !== ward._id.toString());
          
          for (const otherWard of otherWards) {
            if (otherWard.availableBeds > 0) {
              const alternativeScore = await this.calculateCompatibilityScore(otherWard, patient);
              
              if (alternativeScore > currentScore + 30) {
                suggestions.push({
                  patientId: patient._id,
                  patientName: `${patient.userId.firstName} ${patient.userId.lastName}`,
                  currentWard: ward.wardNumber,
                  suggestedWard: otherWard.wardNumber,
                  improvementScore: alternativeScore - currentScore,
                  reason: this.getTransferReason(ward, otherWard, patient)
                });
              }
            }
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.improvementScore - a.improvementScore);
  }

  static getTransferReason(currentWard, suggestedWard, patient) {
    const reasons = [];

    if (suggestedWard.wardType === 'pediatric' && patient.age < 18) {
      reasons.push('Better age-appropriate care');
    }

    if (suggestedWard.genderPreference === patient.gender.toLowerCase()) {
      reasons.push('Gender-specific ward available');
    }

    if (currentWard.occupiedBeds / currentWard.totalBeds > 0.9) {
      reasons.push('Reduce overcrowding');
    }

    return reasons.join(', ') || 'Better overall compatibility';
  }
}

module.exports = WardAllocation;
