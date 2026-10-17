-- Each project can keep its own list of suggested labels; NULL means the defaults.
ALTER TABLE "Project" ADD COLUMN "labelPresets" JSONB;
