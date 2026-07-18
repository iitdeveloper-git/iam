"""iam_009_dynamic_permissions

Revision ID: 0004_iam_009_dynamic_permissions
Revises: 0003_role_is_active
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = '0004_iam_009_dynamic_permissions'
down_revision = '0003_role_is_active'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('permissions', sa.Column('resource', sa.String(length=160), nullable=True))
    op.add_column('permissions', sa.Column('action', sa.String(length=160), nullable=True))
    op.add_column('permissions', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True))

    permissions_table = table('permissions',
        column('id', sa.UUID),
        column('key', sa.String),
        column('resource', sa.String),
        column('action', sa.String),
        column('is_active', sa.Boolean)
    )

    connection = op.get_bind()
    results = connection.execute(sa.select(permissions_table.c.id, permissions_table.c.key)).fetchall()

    for p_id, p_key in results:
        parts = p_key.split('.')
        resource = parts[1] if len(parts) > 1 else parts[0]
        action = parts[-1] if len(parts) > 1 else 'manage'
        connection.execute(
            permissions_table.update().where(permissions_table.c.id == p_id).values(
                resource=resource,
                action=action,
                is_active=True
            )
        )

    with op.batch_alter_table('permissions', schema=None) as batch_op:
        batch_op.alter_column('resource', nullable=False)
        batch_op.alter_column('action', nullable=False)
        batch_op.alter_column('is_active', nullable=False)
        batch_op.drop_constraint('uq_permission_app_key', type_='unique')
        batch_op.create_index(
            'uq_application_permission_key', 
            ['application_id', 'key'], 
            unique=True, 
            postgresql_where=sa.text('application_id IS NOT NULL'), 
            sqlite_where=sa.text('application_id IS NOT NULL')
        )
        batch_op.create_index(
            'uq_platform_permission_key', 
            ['key'], 
            unique=True, 
            postgresql_where=sa.text('application_id IS NULL'), 
            sqlite_where=sa.text('application_id IS NULL')
        )

def downgrade() -> None:
    with op.batch_alter_table('permissions', schema=None) as batch_op:
        batch_op.drop_index('uq_platform_permission_key', postgresql_where=sa.text('application_id IS NULL'), sqlite_where=sa.text('application_id IS NULL'))
        batch_op.drop_index('uq_application_permission_key', postgresql_where=sa.text('application_id IS NOT NULL'), sqlite_where=sa.text('application_id IS NOT NULL'))
        batch_op.create_unique_constraint('uq_permission_app_key', ['application_id', 'key'])
        batch_op.drop_column('is_active')
        batch_op.drop_column('action')
        batch_op.drop_column('resource')
