#![no_std]
#![allow(deprecated)]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ClinicalTrialError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    TrialExists = 3,
    TrialNotFound = 4,
    TrialClosed = 5,
    EnrollmentExists = 6,
    EnrollmentNotFound = 7,
    EnrollmentAlreadyReviewed = 8,
    Unauthorized = 9,
    TargetReached = 10,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EnrollmentStatus {
    Submitted,
    Approved,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
pub struct Trial {
    pub trial_id: u32,
    pub sponsor: Address,
    pub title: String,
    pub target_enrollments: u32,
    pub total_submitted: u32,
    pub total_approved: u32,
    pub total_rejected: u32,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Enrollment {
    pub enrollment_id: u32,
    pub trial_id: u32,
    pub patient: Address,
    pub patient_hash: BytesN<32>,
    pub status: EnrollmentStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct TrialStats {
    pub trial_id: u32,
    pub target_enrollments: u32,
    pub total_submitted: u32,
    pub total_approved: u32,
    pub total_rejected: u32,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TotalTrials,
    TotalEnrollments,
    Trial(u32),
    TrialStats(u32),
    Enrollment(u32),
    TrialEnrollments(u32),
    PatientEnrollments(Address),
}

#[contract]
pub struct ClinicalTrialEnrollContract;

#[contractimpl]
impl ClinicalTrialEnrollContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            panic_with_error!(&env, ClinicalTrialError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TotalTrials, &0u32);
        env.storage()
            .persistent()
            .set(&DataKey::TotalEnrollments, &0u32);

        env.events()
            .publish((symbol_short!("init"), admin.clone()), symbol_short!("ok"));
    }

    pub fn create_trial(
        env: Env,
        sponsor: Address,
        trial_id: u32,
        title: String,
        target_enrollments: u32,
    ) -> Trial {
        let admin = read_admin(&env);

        sponsor.require_auth();

        if sponsor != admin {
            panic_with_error!(&env, ClinicalTrialError::Unauthorized);
        }

        if env.storage().persistent().has(&DataKey::Trial(trial_id)) {
            panic_with_error!(&env, ClinicalTrialError::TrialExists);
        }

        let trial = Trial {
            trial_id,
            sponsor,
            title,
            target_enrollments,
            total_submitted: 0,
            total_approved: 0,
            total_rejected: 0,
            is_active: true,
        };

        let stats = TrialStats {
            trial_id,
            target_enrollments,
            total_submitted: 0,
            total_approved: 0,
            total_rejected: 0,
            is_active: true,
        };

        let mut total_trials = read_total_trials(&env);
        total_trials += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Trial(trial_id), &trial);
        env.storage()
            .persistent()
            .set(&DataKey::TrialStats(trial_id), &stats);
        env.storage()
            .persistent()
            .set(&DataKey::TrialEnrollments(trial_id), &Vec::<u32>::new(&env));
        env.storage()
            .persistent()
            .set(&DataKey::TotalTrials, &total_trials);

        env.events()
            .publish((symbol_short!("trial"), symbol_short!("create")), trial_id);

        trial
    }

    pub fn submit_enrollment(
        env: Env,
        patient: Address,
        trial_id: u32,
        enrollment_id: u32,
        patient_hash: BytesN<32>,
    ) -> Enrollment {
        patient.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::Enrollment(enrollment_id))
        {
            panic_with_error!(&env, ClinicalTrialError::EnrollmentExists);
        }

        let mut trial = read_trial(&env, trial_id);

        if !trial.is_active {
            panic_with_error!(&env, ClinicalTrialError::TrialClosed);
        }

        if trial.total_approved >= trial.target_enrollments {
            panic_with_error!(&env, ClinicalTrialError::TargetReached);
        }

        let enrollment = Enrollment {
            enrollment_id,
            trial_id,
            patient: patient.clone(),
            patient_hash,
            status: EnrollmentStatus::Submitted,
        };

        trial.total_submitted += 1;

        let mut stats = read_trial_stats(&env, trial_id);
        stats.total_submitted += 1;

        let mut total_enrollments = read_total_enrollments(&env);
        total_enrollments += 1;

        let mut trial_enrollments = read_trial_enrollments(&env, trial_id);
        trial_enrollments.push_back(enrollment_id);

        let mut patient_enrollments = read_patient_enrollments(&env, patient.clone());
        patient_enrollments.push_back(enrollment_id);

        env.storage()
            .persistent()
            .set(&DataKey::Enrollment(enrollment_id), &enrollment);
        env.storage()
            .persistent()
            .set(&DataKey::Trial(trial_id), &trial);
        env.storage()
            .persistent()
            .set(&DataKey::TrialStats(trial_id), &stats);
        env.storage()
            .persistent()
            .set(&DataKey::TotalEnrollments, &total_enrollments);
        env.storage()
            .persistent()
            .set(&DataKey::TrialEnrollments(trial_id), &trial_enrollments);
        env.storage()
            .persistent()
            .set(&DataKey::PatientEnrollments(patient), &patient_enrollments);

        env.events().publish(
            (symbol_short!("enroll"), symbol_short!("submit")),
            enrollment_id,
        );

        enrollment
    }

    pub fn approve_enrollment(env: Env, reviewer: Address, enrollment_id: u32) -> Enrollment {
        let admin = read_admin(&env);

        reviewer.require_auth();

        if reviewer != admin {
            panic_with_error!(&env, ClinicalTrialError::Unauthorized);
        }

        let mut enrollment = read_enrollment(&env, enrollment_id);

        if enrollment.status != EnrollmentStatus::Submitted {
            panic_with_error!(&env, ClinicalTrialError::EnrollmentAlreadyReviewed);
        }

        let mut trial = read_trial(&env, enrollment.trial_id);
        let mut stats = read_trial_stats(&env, enrollment.trial_id);

        enrollment.status = EnrollmentStatus::Approved;

        trial.total_approved += 1;
        stats.total_approved += 1;

        if trial.total_approved >= trial.target_enrollments {
            trial.is_active = false;
            stats.is_active = false;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Enrollment(enrollment_id), &enrollment);
        env.storage()
            .persistent()
            .set(&DataKey::Trial(enrollment.trial_id), &trial);
        env.storage()
            .persistent()
            .set(&DataKey::TrialStats(enrollment.trial_id), &stats);

        env.events().publish(
            (symbol_short!("enroll"), symbol_short!("approve")),
            enrollment_id,
        );

        enrollment
    }

    pub fn reject_enrollment(env: Env, reviewer: Address, enrollment_id: u32) -> Enrollment {
        let admin = read_admin(&env);

        reviewer.require_auth();

        if reviewer != admin {
            panic_with_error!(&env, ClinicalTrialError::Unauthorized);
        }

        let mut enrollment = read_enrollment(&env, enrollment_id);

        if enrollment.status != EnrollmentStatus::Submitted {
            panic_with_error!(&env, ClinicalTrialError::EnrollmentAlreadyReviewed);
        }

        let mut trial = read_trial(&env, enrollment.trial_id);
        let mut stats = read_trial_stats(&env, enrollment.trial_id);

        enrollment.status = EnrollmentStatus::Rejected;

        trial.total_rejected += 1;
        stats.total_rejected += 1;

        env.storage()
            .persistent()
            .set(&DataKey::Enrollment(enrollment_id), &enrollment);
        env.storage()
            .persistent()
            .set(&DataKey::Trial(enrollment.trial_id), &trial);
        env.storage()
            .persistent()
            .set(&DataKey::TrialStats(enrollment.trial_id), &stats);

        env.events().publish(
            (symbol_short!("enroll"), symbol_short!("reject")),
            enrollment_id,
        );

        enrollment
    }

    pub fn get_admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn get_trial(env: Env, trial_id: u32) -> Trial {
        read_trial(&env, trial_id)
    }

    pub fn get_enrollment(env: Env, enrollment_id: u32) -> Enrollment {
        read_enrollment(&env, enrollment_id)
    }

    pub fn get_trial_stats(env: Env, trial_id: u32) -> TrialStats {
        read_trial_stats(&env, trial_id)
    }

    pub fn get_trial_enrollments(env: Env, trial_id: u32) -> Vec<u32> {
        read_trial_enrollments(&env, trial_id)
    }

    pub fn get_patient_enrollments(env: Env, patient: Address) -> Vec<u32> {
        read_patient_enrollments(&env, patient)
    }

    pub fn get_total_trials(env: Env) -> u32 {
        read_total_trials(&env)
    }

    pub fn get_total_enrollments(env: Env) -> u32 {
        read_total_enrollments(&env)
    }
}

fn read_admin(env: &Env) -> Address {
    if let Some(admin) = env.storage().persistent().get(&DataKey::Admin) {
        admin
    } else {
        panic_with_error!(env, ClinicalTrialError::NotInitialized);
    }
}

fn read_trial(env: &Env, trial_id: u32) -> Trial {
    if let Some(trial) = env.storage().persistent().get(&DataKey::Trial(trial_id)) {
        trial
    } else {
        panic_with_error!(env, ClinicalTrialError::TrialNotFound);
    }
}

fn read_enrollment(env: &Env, enrollment_id: u32) -> Enrollment {
    if let Some(enrollment) = env
        .storage()
        .persistent()
        .get(&DataKey::Enrollment(enrollment_id))
    {
        enrollment
    } else {
        panic_with_error!(env, ClinicalTrialError::EnrollmentNotFound);
    }
}

fn read_trial_stats(env: &Env, trial_id: u32) -> TrialStats {
    if let Some(stats) = env
        .storage()
        .persistent()
        .get(&DataKey::TrialStats(trial_id))
    {
        stats
    } else {
        panic_with_error!(env, ClinicalTrialError::TrialNotFound);
    }
}

fn read_trial_enrollments(env: &Env, trial_id: u32) -> Vec<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::TrialEnrollments(trial_id))
        .unwrap_or(Vec::<u32>::new(env))
}

fn read_patient_enrollments(env: &Env, patient: Address) -> Vec<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::PatientEnrollments(patient))
        .unwrap_or(Vec::<u32>::new(env))
}

fn read_total_trials(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::TotalTrials)
        .unwrap_or(0)
}

fn read_total_enrollments(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::TotalEnrollments)
        .unwrap_or(0)
}

#[cfg(test)]
mod test;
