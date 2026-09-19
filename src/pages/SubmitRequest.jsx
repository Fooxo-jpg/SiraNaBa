import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import AttachmentGrid from '../components/AttachmentGrid.jsx';
import { endpoints } from '../api/endpoints.js';
import { db } from '../data/mockDb.js';

const STEPS = ['Details', 'Location', 'Review'];

const initialForm = {
  category: '',
  title: '',
  description: '',
  location: '',
  attachments: [],
};

export default function SubmitRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addAttachments = (items) =>
    setForm((f) => ({ ...f, attachments: [...f.attachments, ...items] }));
  const removeAttachment = (id) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));

  const validateStep = () => {
    const next = {};
    if (step === 0) {
      if (!form.category) next.category = 'Choose a category.';
      if (!form.title.trim()) next.title = 'Give the request a short title.';
      if (!form.description.trim()) next.description = 'Add a description so we can prepare.';
    }
    if (step === 1 && !form.location.trim()) {
      next.location = 'Tell us where the issue is.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    try {
      await endpoints.createTicket({
        category: form.category,
        title: form.title,
        description: form.description,
        location: form.location,
        attachments: form.attachments.map(({ id, name, previewUrl }) => ({
          id,
          label: name,
          previewUrl,
        })),
      });
      navigate('/maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout crumb="Submit Request">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink-900">Submit Maintenance Request</h1>
        <p className="mt-1 text-sm text-ink-700/60">
          Describe the issue in your unit. Our team will review and dispatch a specialist within 24
          hours.
        </p>

        {/* Stepper */}
        <div className="my-6 flex items-center">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    i < step
                      ? 'bg-forest-500 text-white'
                      : i === step
                      ? 'border-2 border-forest-500 text-forest-600'
                      : 'border-2 border-black/10 text-ink-700/30'
                  }`}
                >
                  {i < step ? <Icon name="check" size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-forest-600' : 'text-ink-700/40'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${i < step ? 'bg-forest-500' : 'bg-black/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className="p-6">
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-900">
                    Request Category
                  </label>
                  <select
                    value={form.category}
                    onChange={update('category')}
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest-400"
                  >
                    <option value="">Select category...</option>
                    {db.ticketCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-status-high">{errors.category}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-900">Summary Title</label>
                  <input
                    value={form.title}
                    onChange={update('title')}
                    placeholder="e.g., Kitchen faucet leaking"
                    className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400"
                  />
                  {errors.title && <p className="mt-1 text-xs text-status-high">{errors.title}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-900">
                  Detailed Description
                </label>
                <textarea
                  value={form.description}
                  onChange={update('description')}
                  rows={5}
                  placeholder="Please provide as much detail as possible to help our technicians prepare."
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-status-high">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-900">
                  Photos &amp; Evidence <span className="font-normal text-ink-700/40">(optional)</span>
                </label>
                <AttachmentGrid
                  attachments={form.attachments}
                  onAdd={addAttachments}
                  onRemove={removeAttachment}
                />
                <p className="mt-1.5 text-xs text-ink-700/50">
                  Attach up to 5 photos or PDFs so our technicians know what to expect.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-forest-50 p-3.5 text-xs text-forest-700">
                <Icon name="info" size={15} className="mt-0.5 flex-shrink-0" />
                Include details like specific brands of appliances or the exact behavior of the
                fault (e.g., "only leaks when the dishwasher runs").
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-900">
                  Where is the issue located?
                </label>
                <input
                  value={form.location}
                  onChange={update('location')}
                  placeholder="e.g., Kitchen / Main Sink"
                  className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400"
                />
                {errors.location && <p className="mt-1 text-xs text-status-high">{errors.location}</p>}
              </div>
              <p className="text-xs text-ink-700/50">
                Being specific (room and fixture) helps our technician arrive fully equipped.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-sm">
              <h3 className="font-semibold text-ink-900">Review your request</h3>
              <dl className="divide-y divide-black/5 rounded-lg border border-black/5">
                {[
                  ['Category', form.category],
                  ['Title', form.title],
                  ['Description', form.description],
                  ['Location', form.location],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-3 gap-3 px-4 py-3">
                    <dt className="text-ink-700/50">{label}</dt>
                    <dd className="col-span-2 font-medium text-ink-900">{value || '—'}</dd>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 px-4 py-3">
                  <dt className="text-ink-700/50">Photos</dt>
                  <dd className="col-span-2">
                    {form.attachments.length > 0 ? (
                      <AttachmentGrid attachments={form.attachments} onRemove={removeAttachment} />
                    ) : (
                      <span className="font-medium text-ink-900">—</span>
                    )}
                  </dd>
                </div>
              </dl>
              <p className="flex items-center gap-1.5 text-xs text-ink-700/50">
                <Icon name="info" size={13} /> Severity will show as "Loading" until our AI triage
                system assesses your request.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-5">
            <button
              onClick={goBack}
              disabled={step === 0}
              className="text-sm font-medium text-ink-700/70 hover:text-ink-900 disabled:opacity-0"
            >
              ‹ Previous Step
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/maintenance')}
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-sand-100"
              >
                Cancel
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600"
                >
                  Continue to Next Step ›
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card className="mt-5 flex items-start gap-3 p-5">
          <Icon name="shield" size={18} className="mt-0.5 flex-shrink-0 text-forest-600" />
          <div>
            <p className="text-sm font-semibold text-ink-900">Facility Management Standards</p>
            <p className="text-xs leading-relaxed text-ink-700/60">
              SiraNaBa employs an AI-driven triage system. Accurate information regarding location
              and hazards ensures that our specialists arrive fully equipped to resolve your issue
              on the first visit, maintaining the high living standards of our community.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
