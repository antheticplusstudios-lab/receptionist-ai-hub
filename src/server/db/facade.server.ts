import { db1Admin, db2Admin, db3Admin, db4Admin } from "@/server/db/clients.server";

const DB1 = new Set(["organizations","profiles","organization_members","user_roles","account_restrictions","staff_permissions","staff_invites","feature_flags","platform_settings","audit_logs","user_activity_events","outbox_events","processed_events"]);
const DB2 = new Set(["orders","payment_verifications","payment_methods","pricing_plans","product_prices","promo_codes","subscriptions","client_automations","automation_installations","automation_tasks","script_generations","integration_connections","usage_events","usage_meters","automation_health","automation_health_checks","automation_health_state","outbox_events","processed_events"]);
const DB3 = new Set(["knowledge_bases","kb_documents","kb_chunks","crawl_jobs","ai_configs","ai_config_versions","prompt_versions","llm_providers","llm_api_keys","llm_requests","semantic_cache","ai_evaluations","outbox_events","processed_events"]);
const DB4 = new Set(["crm_clients","client_tags","conversations","messages","leads","appointments","availability_windows","ticket_escalations","conversation_diagnostics","round_robin_teams","round_robin_members","round_robin_rules","round_robin_assignments","round_robin_state","workflow_definitions","workflow_steps","workflow_schedules","workflow_webhooks","workflow_runs","workflow_run_steps","outbox_events","processed_events"]);

export function dbForTable(table: string) {
  if (DB1.has(table)) return db1Admin;
  if (DB2.has(table)) return db2Admin;
  if (DB3.has(table)) return db3Admin;
  if (DB4.has(table)) return db4Admin;
  throw new Error(`No database mapping registered for table: ${table}`);
}

const DB2_RPCS = new Set(["generate_automation_token","resolve_widget_installation","automation_local_runtime_state","set_automation_runtime_state","automation_runtime_state","run_subscription_lifecycle","record_usage","admin_automation_action","admin_generate_script","admin_update_widget_config","can_manage_client_automation","owns_client_automation","increment_usage_meter"]);
const DB1_RPCS = new Set(["is_admin","is_staff","has_role","my_origin_domain","claim_staff_invite","my_account_status","is_blocked","is_muted","admin_moderate_user"]);

export function rpcFor(name: string) {
  if (DB1_RPCS.has(name)) return db1Admin;
  if (DB2_RPCS.has(name)) return db2Admin;
  if (["match_documents","semantic_cache_lookup","match_kb_chunks","insert_kb_chunk"].includes(name)) return db3Admin;
  if (["assign_round_robin"].includes(name)) return db4Admin;
  return db1Admin;
}

export function createMultiDbAdminFacade() {
  return {
    from: (table: string) => dbForTable(table).from(table),
    rpc: (name: string, args?: Record<string, unknown>) => rpcFor(name).rpc(name, args),
    auth: db1Admin.auth,
  };
}
