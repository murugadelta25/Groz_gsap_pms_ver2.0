"""Create gsap_sync table and work_orders GSAP linkage columns."""
from sqlalchemy import inspect, text

from app.models import engine


def _ensure_column(conn, table: str, column: str, ddl: str) -> None:
    insp = inspect(engine)
    if not insp.has_table(table):
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if column not in cols:
        conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN {ddl}"))
        print(f"[OK] {table}.{column} added")


def main() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        if not insp.has_table("gsap_sync"):
            conn.execute(text("""
                CREATE TABLE gsap_sync (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    material VARCHAR(100) NOT NULL,
                    plant VARCHAR(50) NULL,
                    created_on DATE NULL,
                    valid_from DATE NULL,
                    operation VARCHAR(50) NULL,
                    work_centre VARCHAR(100) NULL,
                    op_short_text VARCHAR(255) NULL,
                    setup_time VARCHAR(50) NULL,
                    machine_time VARCHAR(50) NULL,
                    upload_batch_id VARCHAR(36) NULL,
                    uploaded_by INT NULL,
                    uploaded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_gsap_material (material),
                    INDEX idx_gsap_batch (upload_batch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))
            print("[OK] gsap_sync table created")
        else:
            print("[SKIP] gsap_sync table exists")

        _ensure_column(conn, "work_orders", "part_source", "part_source VARCHAR(20) NOT NULL DEFAULT 'part_master'")
        _ensure_column(conn, "work_orders", "gsap_sync_id", "gsap_sync_id INT NULL")
        try:
            conn.execute(text(
                "ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_gsap_sync "
                "FOREIGN KEY (gsap_sync_id) REFERENCES gsap_sync(id) ON DELETE SET NULL"
            ))
            print("[OK] work_orders.gsap_sync_id FK added")
        except Exception as exc:
            if "Duplicate" not in str(exc) and "already exists" not in str(exc).lower():
                print(f"[SKIP] work_orders.gsap_sync_id FK: {exc}")


if __name__ == "__main__":
    main()
