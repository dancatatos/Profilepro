"use client";

/**
 * Reusable "Are you sure?" prompt for destructive actions.
 *
 * Lives on top of the existing Modal primitive so it inherits the
 * bottom-sheet-on-mobile / centered-card-on-desktop behaviour and
 * the matching backdrop / escape / scroll-lock handling.
 *
 * Designed to be drop-in: pass `open`, `onCancel`, `onConfirm`, and
 * the copy you want. The confirm button shows a spinner while
 * `loading` is true and disables both buttons so the user can't
 * double-fire or escape mid-action.
 */

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  /** Inline body — useful for showing the name of the thing being deleted. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Visual tone of the confirm button.
   *   danger  → red, used for destructive actions like delete (default)
   *   primary → brand gradient, used for irreversible-but-positive actions
   */
  tone?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={() => !loading && onCancel()}
      title={title}
      description={description}
      size="sm"
    >
      <div className="space-y-4 pb-2">
        {/* Visual cue + body. We always render the warning glyph for
            danger-toned dialogs so the action's severity registers
            without forcing the caller to bring their own icon. */}
        <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span
            className={
              tone === "danger"
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-electric-500/10 text-electric-600"
            }
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-sm text-slate-700">
            {body ?? (
              <p>This action can&apos;t be undone — make sure you mean it.</p>
            )}
          </div>
        </div>

        {/* Buttons — Cancel first on the LEFT so the destructive
            action isn't the closest target to the user's thumb on
            mobile (helps prevent accidental confirmations after the
            user already paused on the dialog). */}
        <div className="flex gap-2">
          <Button
            fullWidth
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            fullWidth
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
            className={
              tone === "danger"
                ? "!bg-red-500 !text-white hover:!bg-red-600"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
