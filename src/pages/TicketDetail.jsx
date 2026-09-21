import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import AttachmentGrid from '../components/AttachmentGrid.jsx';
import { LoadingState, ErrorState } from '../components/Common.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatDate, formatTime } from '../utils/format.js';
import { useAutoRefresh } from '../utils/useAutoRefresh.js';

const STAGES = ['Submitted', 'Assigned', 'Resolved'];

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null); // 'message' | 'call' | 'chatAdmin' | 'escalate'

  const load = useCallback(() => {
    setStatus('loading');
    endpoints
      .getTicket(id)
      .then((data) => {
        setTicket(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const withdrawTicket = () => {
    if (!ticket) return;
    endpoints.updateTicket(ticket.id, { stage: 'Resolved' }).then(load);
  };

  const addAttachments = (items) => {
    if (!ticket) return;
    const updated = [
      ...(ticket.attachments || []),
      ...items.map(({ id, name, previewUrl, dataUrl }) => ({ id, label: name, previewUrl, dataUrl })),
    ];
    endpoints.updateTicket(ticket.id, { attachments: updated }).then(load);
  };

  const removeAttachment = (attId) => {
    if (!ticket) return;
    const updated = (ticket.attachments || []).filter((a) => a.id !== attId);
    endpoints.updateTicket(ticket.id, { attachments: updated }).then(load);
  };

  // Older tickets may still carry the retired In Progress value; display them
  // at the Assigned step rather than leaving the tracker without a current step.
  const displayStage = ticket?.stage === 'In Progress' ? 'Assigned' : ticket?.stage;
  const stageIndex = ticket ? STAGES.indexOf(displayStage) : -1;
  const isLive = false;
  const isUrgent = ['Severe', 'Critical'].includes(ticket?.priority);
  const isPending = ticket?.priority === 'Loading...' || !ticket?.priority;
  const hasSpecialist = ticket?.specialist && ticket.specialist.name !== 'Unassigned';
  const firstName = ticket?.specialist?.name?.split(' ')[0] || 'the technician';

  return (
    <Layout crumb={`Maintenance / ${id}`}>
      {status === 'loading' && <LoadingState label="Loading ticket…" />}
      {status === 'error' && <ErrorState message="We couldn't load this ticket." onRetry={load} />}

      {status === 'ready' && ticket && (
        <div className="space-y-6">
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-700/60 hover:text-forest-600"
          >
            <Icon name="chevronLeft" size={15} /> Back to Tickets
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {isLive && (
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-forest-600">
                  <Icon name="clock" size={13} /> Live Status Tracking
                </p>
              )}
              <h1 className="text-2xl font-bold text-ink-900">Ticket #{ticket.id}</h1>
              <p className="mt-0.5 text-sm text-ink-700/60">{ticket.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="flex items-center gap-1.5 rounded-full bg-status-successBg px-3 py-1 text-xs font-semibold text-status-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success" /> Live: {ticket.stage}
                </span>
              )}
              {isPending && (
                <span className="flex items-center gap-1.5 rounded-full bg-status-progressBg px-3 py-1 text-xs font-semibold text-status-progress">
                  <Icon name="clock" size={12} /> Severity: Loading...
                </span>
              )}
              {isUrgent && (
                <span className="flex items-center gap-1 rounded-full bg-status-highBg px-3 py-1 text-xs font-semibold text-status-high">
                  <Icon name="alert" size={12} /> Urgent
                </span>
              )}
            </div>
          </div>

          {/* Stage tracker */}
          <Card className="p-6">
            <div className="flex items-center">
              {STAGES.map((stage, i) => (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                        i < stageIndex
                          ? 'border-forest-500 bg-forest-500 text-white'
                          : i === stageIndex
                          ? 'border-forest-500 text-forest-600 ring-4 ring-forest-100'
                          : 'border-black/10 text-ink-700/30'
                      }`}
                    >
                      {i < stageIndex ? (
                        <Icon name="check" size={16} />
                      ) : i === stageIndex ? (
                        <Icon name="wrench" size={16} />
                      ) : (
                        <Icon name="check" size={16} />
                      )}
                    </div>
                    <span
                      className={`text-center text-[11px] font-medium ${
                        i === stageIndex ? 'text-forest-600' : 'text-ink-700/40'
                      }`}
                    >
                      {stage}
                    </span>
                    {i === stageIndex && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-forest-500">Live</span>
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 ${i < stageIndex ? 'bg-forest-500' : 'bg-black/10'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            {hasSpecialist && (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-forest-200 bg-forest-50 p-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-forest-600 shadow-sm">
                  <Icon name="wrench" size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">Assigned maintenance staff</p>
                  <p className="truncate text-sm font-semibold text-ink-900">{ticket.specialist.name}</p>
                  <p className="truncate text-xs text-ink-700/60">{ticket.specialist.title} · {ticket.specialist.phone || 'Contact details pending'}</p>
                </div>
                <span className="ml-auto rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-forest-700">Assigned</span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: overview / activity */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="mb-5 flex items-center gap-1 border-b border-black/5">
                  <button
                    onClick={() => setTab('overview')}
                    className={`border-b-2 px-3 pb-2.5 text-sm font-semibold transition-colors ${
                      tab === 'overview'
                        ? 'border-forest-500 text-forest-600'
                        : 'border-transparent text-ink-700/50 hover:text-ink-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setTab('activity')}
                    className={`border-b-2 px-3 pb-2.5 text-sm font-semibold transition-colors ${
                      tab === 'activity'
                        ? 'border-forest-500 text-forest-600'
                        : 'border-transparent text-ink-700/50 hover:text-ink-900'
                    }`}
                  >
                    Activity Log
                  </button>
                </div>

                {tab === 'overview' && (
                  <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                          Issue Description
                        </p>
                        <p className="text-sm leading-relaxed text-ink-900">{ticket.description}</p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                          Location &amp; Room
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                          <Icon name="grid" size={14} className="text-ink-700/40" /> {ticket.location}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                          Reported On
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                          <Icon name="calendar" size={14} className="text-ink-700/40" /> {formatDate(ticket.submittedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                          Estimated Completion
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-forest-600">
                          <Icon name="clock" size={14} /> {ticket.estimatedCompletion || 'Pending assessment'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-black/5 pt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                        Attachments &amp; Evidence
                      </p>
                      <AttachmentGrid
                        attachments={ticket.attachments}
                        onAdd={addAttachments}
                        onRemove={removeAttachment}
                      />
                      <p className="mt-1.5 text-xs text-ink-700/50">
                        Attach up to 5 photos or PDFs so our technicians know what to expect.
                      </p>
                    </div>

                    {ticket.safetyNote && (
                      <div className="mt-5 flex items-center justify-between rounded-lg bg-status-highBg px-4 py-3">
                        <p className="flex items-center gap-2 text-xs text-status-high">
                          <Icon name="info" size={14} /> Safety Note: {ticket.safetyNote}
                        </p>
                        <button
                          onClick={withdrawTicket}
                          className="text-xs font-semibold text-status-high hover:underline"
                        >
                          Withdraw Request
                        </button>
                      </div>
                    )}
                  </>
                )}

                {tab === 'activity' && (
                  <div>
                    {ticket.timeline?.length > 0 ? (
                      <ul className="space-y-4">
                        {ticket.timeline.map((event) => (
                          <li key={event.id} className="flex gap-3">
                            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600">
                              <Icon name="check" size={13} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                              <p className="text-xs leading-relaxed text-ink-700/60">{event.detail}</p>
                              <p className="mt-0.5 text-xs text-ink-700/40">
                                {formatTime(event.timestamp)} • {formatDate(event.timestamp)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-6 text-center text-sm text-ink-700/50">No activity logged yet.</p>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: assigned pro + safety + actions */}
            <div className="space-y-6">
              <Card className="p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                  Assigned Professional
                </p>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-700/50">
                    <Icon name="wrench" size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {ticket.specialist?.name || 'Unassigned'}
                    </p>
                    <p className="truncate text-xs text-ink-700/50">
                      {ticket.specialist?.title || 'Awaiting dispatch'}
                    </p>
                    {ticket.specialist?.rating > 0 && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/60">
                        <Icon name="star" size={12} className="text-amber-500" />
                        {ticket.specialist.rating.toFixed(1)}
                        <span className="text-ink-700/40">({ticket.specialist.reviewCount}+ reviews)</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="mb-0.5 flex items-center gap-1 font-medium text-ink-700/50">
                      <Icon name="clock" size={12} /> Estimated Arrival
                    </p>
                    <p className="font-semibold text-ink-900">{ticket.specialist?.eta || 'TBD'}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 font-medium text-ink-700/50">Status</p>
                    <p className="font-semibold text-ink-900">{ticket.specialist?.status || 'Not started'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setModal('message')}
                    disabled={!hasSpecialist}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-forest-500 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="chat" size={15} /> Message {hasSpecialist ? firstName : 'Specialist'}
                  </button>
                  <button
                    onClick={() => setModal('call')}
                    disabled={!hasSpecialist}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-black/10 py-2.5 text-sm font-medium hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="phone" size={15} /> Call Professional
                  </button>
                </div>
              </Card>

              <Card className="bg-forest-600 p-5 text-white">
                <p className="mb-1 font-semibold">Safety &amp; Security</p>
                <p className="mb-3 text-xs text-white/70">
                  Our technicians are background checked and follow all facility safety protocols.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-medium">
                    <Icon name="check" size={13} /> Verified Professional Dispatch
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-medium">
                    <Icon name="clock" size={13} /> Standard 2-Hour Response Time
                  </div>
                </div>
              </Card>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">Quick Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModal('chatAdmin')}
                    className="flex flex-col items-center gap-1 rounded-lg border border-black/10 py-3 text-xs font-medium hover:bg-sand-100"
                  >
                    <Icon name="chat" size={17} /> Chat Admin
                  </button>
                  <button
                    onClick={() => setModal('escalate')}
                    className="flex flex-col items-center gap-1 rounded-lg border border-status-high/20 py-3 text-xs font-medium text-status-high hover:bg-status-highBg"
                  >
                    <Icon name="alert" size={17} /> Escalate
                  </button>
                </div>
              </div>

              {isLive && (
                <Card className="flex items-start gap-2.5 border border-forest-200 bg-forest-50 p-4 shadow-none">
                  <Icon name="check" size={16} className="mt-0.5 flex-shrink-0 text-forest-600" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Quality Check Required</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-700/60">
                      Once {firstName} marks the work as done, you'll be asked to confirm resolution
                      and rate the service.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message specialist */}
      <Modal
        open={modal === 'message'}
        onClose={() => setModal(null)}
        title={`Message ${ticket?.specialist?.name || ''}`}
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setModal(null)}
              className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
            >
              Send
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          placeholder={`Write a message to ${ticket?.specialist?.name || 'the specialist'}…`}
          className="w-full rounded-md border border-black/10 p-3 text-sm outline-none focus:border-forest-400"
        />
      </Modal>

      {/* Call specialist */}
      <Modal open={modal === 'call'} onClose={() => setModal(null)} title="Call Professional">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-600">
            <Icon name="phone" size={22} />
          </div>
          <p className="text-sm font-semibold text-ink-900">{ticket?.specialist?.name}</p>
          <p className="text-xs text-ink-700/50">
            {ticket?.specialist?.phone || 'No phone number on file for this technician yet.'}
          </p>
        </div>
      </Modal>

      {/* Chat admin */}
      <Modal
        open={modal === 'chatAdmin'}
        onClose={() => setModal(null)}
        title="Chat with Admin"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setModal(null)}
              className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600"
            >
              Send
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          placeholder="Ask a question about this ticket…"
          className="w-full rounded-md border border-black/10 p-3 text-sm outline-none focus:border-forest-400"
        />
      </Modal>

      {/* Escalate */}
      <Modal
        open={modal === 'escalate'}
        onClose={() => setModal(null)}
        title="Escalate This Ticket"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setModal(null)}
              className="rounded-md bg-status-high px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Escalate
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-700/70">
          This will flag your request for the property manager's immediate attention. Use this if
          the issue is urgent or hasn't progressed within the expected time.
        </p>
      </Modal>
    </Layout>
  );
}
