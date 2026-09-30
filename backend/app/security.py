from __future__ import annotations
from fastapi import Header, HTTPException
from .supabase import db1, db2, db4

async def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Unauthorized')
    token = authorization[7:].strip()
    try:
        return await db1.auth_user(token)
    except Exception as exc:
        raise HTTPException(401, 'Unauthorized') from exc

async def tenant_context(user: dict) -> dict:
    user_id = str(user.get('id') or '')
    if not user_id:
        raise HTTPException(401, 'Unauthorized')
    profile = await db1.table('profiles', select='id,default_organization_id', filters=[('id', f'eq.{user_id}')], single=True)
    if not profile or not profile.get('default_organization_id'):
        raise HTTPException(403, 'Account is not provisioned')
    client_id = str(profile['default_organization_id'])
    roles = await db1.table('user_roles', select='role', filters=[('user_id', f'eq.{user_id}')])
    role_names = {str(x.get('role')) for x in (roles or [])}
    staff = bool(role_names & {'owner', 'admin', 'staff', 'verifier', 'partner'})
    super_admin = bool(role_names & {'owner', 'admin'})
    restriction = await db1.table('account_restrictions', select='status,muted', filters=[('user_id', f'eq.{user_id}')], single=True)
    status = str((restriction or {}).get('status', 'active'))
    if status != 'active':
        raise HTTPException(403, 'Account is restricted')
    return {'user_id': user_id, 'client_id': client_id, 'roles': role_names, 'is_staff': staff, 'is_super_admin': super_admin}

async def assert_automation_access(user: dict, automation_id: str) -> dict:
    ctx = await tenant_context(user)
    automation = await db2.table('client_automations', select='id,client_id,automation_type,run_state,is_active', filters=[('id', f'eq.{automation_id}')], single=True)
    if not automation:
        raise HTTPException(404, 'Automation not found')
    owner = str(automation.get('client_id')) == ctx['client_id']
    if not owner and not ctx['is_staff']:
        raise HTTPException(404, 'Automation not found')
    return {**ctx, 'automation': automation}

async def assert_conversation_access(user: dict, conversation_id: str) -> dict:
    ctx = await tenant_context(user)
    conversation = await db4.table('conversations', select='id,client_id,automation_id,status', filters=[('id', f'eq.{conversation_id}')], single=True)
    if not conversation:
        raise HTTPException(404, 'Conversation not found')
    owner = str(conversation.get('client_id')) == ctx['client_id']
    if not owner and not ctx['is_staff']:
        raise HTTPException(404, 'Conversation not found')
    return {**ctx, 'conversation': conversation}
