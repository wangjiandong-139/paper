-- CreateTable: LocalCredential
CREATE TABLE "LocalCredential" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocalCredential_user_id_key" ON "LocalCredential"("user_id");
CREATE UNIQUE INDEX "LocalCredential_username_key" ON "LocalCredential"("username");

ALTER TABLE "LocalCredential" ADD CONSTRAINT "LocalCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
