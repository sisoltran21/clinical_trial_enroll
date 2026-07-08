#![cfg(test)]

extern crate std;

use super::{ClinicalTrialEnrollContract, ClinicalTrialEnrollContractClient, EnrollmentStatus};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

fn setup() -> (
    Env,
    ClinicalTrialEnrollContractClient<'static>,
    Address,
    Address,
    Address,
) {
    let env = Env::default();

    env.mock_all_auths();

    let contract_id = env.register(ClinicalTrialEnrollContract, ());

    let client = ClinicalTrialEnrollContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let patient_one = Address::generate(&env);
    let patient_two = Address::generate(&env);

    (env, client, admin, patient_one, patient_two)
}

fn hash(env: &Env, value: u8) -> BytesN<32> {
    BytesN::from_array(env, &[value; 32])
}

#[test]
fn initialize_sets_admin_and_empty_counters() {
    let (_env, client, admin, _patient_one, _patient_two) = setup();

    client.initialize(&admin);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_total_trials(), 0);
    assert_eq!(client.get_total_enrollments(), 0);
}

#[test]
fn create_trial_stores_trial_and_stats() {
    let (env, client, admin, _patient_one, _patient_two) = setup();

    client.initialize(&admin);

    let title = String::from_str(&env, "Diabetes Trial");

    let trial = client.create_trial(&admin, &1, &title, &2);

    let stored = client.get_trial(&1);
    let stats = client.get_trial_stats(&1);

    assert_eq!(trial.trial_id, 1);
    assert_eq!(stored.trial_id, 1);
    assert_eq!(stored.sponsor, admin);
    assert_eq!(stored.target_enrollments, 2);
    assert_eq!(stored.total_submitted, 0);
    assert_eq!(stored.total_approved, 0);
    assert_eq!(stored.total_rejected, 0);
    assert_eq!(stored.is_active, true);

    assert_eq!(stats.trial_id, 1);
    assert_eq!(stats.target_enrollments, 2);
    assert_eq!(stats.total_submitted, 0);
    assert_eq!(stats.total_approved, 0);
    assert_eq!(stats.total_rejected, 0);
    assert_eq!(stats.is_active, true);

    assert_eq!(client.get_total_trials(), 1);
}

#[test]
fn submit_enrollment_tracks_trial_and_patient_history() {
    let (env, client, admin, patient_one, _patient_two) = setup();

    client.initialize(&admin);

    let title = String::from_str(&env, "Cardiology Trial");

    client.create_trial(&admin, &7, &title, &3);

    let enrollment = client.submit_enrollment(&patient_one, &7, &101, &hash(&env, 1));

    let stored = client.get_enrollment(&101);
    let stats = client.get_trial_stats(&7);
    let trial_history = client.get_trial_enrollments(&7);
    let patient_history = client.get_patient_enrollments(&patient_one);

    assert_eq!(enrollment.enrollment_id, 101);
    assert_eq!(stored.trial_id, 7);
    assert_eq!(stored.patient, patient_one);
    assert_eq!(stored.status, EnrollmentStatus::Submitted);

    assert_eq!(stats.total_submitted, 1);
    assert_eq!(stats.total_approved, 0);
    assert_eq!(stats.total_rejected, 0);

    assert_eq!(trial_history.len(), 1);
    assert_eq!(trial_history.get(0).unwrap(), 101);

    assert_eq!(patient_history.len(), 1);
    assert_eq!(patient_history.get(0).unwrap(), 101);

    assert_eq!(client.get_total_enrollments(), 1);
}

#[test]
fn approve_enrollment_updates_status_and_closes_trial_at_target() {
    let (env, client, admin, patient_one, _patient_two) = setup();

    client.initialize(&admin);

    let title = String::from_str(&env, "Rare Disease Trial");

    client.create_trial(&admin, &8, &title, &1);

    client.submit_enrollment(&patient_one, &8, &201, &hash(&env, 2));

    let approved = client.approve_enrollment(&admin, &201);
    let trial = client.get_trial(&8);
    let stats = client.get_trial_stats(&8);

    assert_eq!(approved.status, EnrollmentStatus::Approved);
    assert_eq!(trial.total_approved, 1);
    assert_eq!(trial.is_active, false);
    assert_eq!(stats.total_approved, 1);
    assert_eq!(stats.is_active, false);
}

#[test]
fn reject_enrollment_updates_status_and_stats() {
    let (env, client, admin, _patient_one, patient_two) = setup();

    client.initialize(&admin);

    let title = String::from_str(&env, "Nutrition Trial");

    client.create_trial(&admin, &9, &title, &5);

    client.submit_enrollment(&patient_two, &9, &301, &hash(&env, 3));

    let rejected = client.reject_enrollment(&admin, &301);
    let trial = client.get_trial(&9);
    let stats = client.get_trial_stats(&9);

    assert_eq!(rejected.status, EnrollmentStatus::Rejected);
    assert_eq!(trial.total_rejected, 1);
    assert_eq!(trial.is_active, true);
    assert_eq!(stats.total_rejected, 1);
    assert_eq!(stats.is_active, true);
}
