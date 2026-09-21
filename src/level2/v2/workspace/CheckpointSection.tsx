import type { V2SourceCase } from '../../../domain/level2/v2';
import type {
  V2AmountCheckpointSectionId,
  V2CheckpointAmountField,
  V2GradingStatus,
  V2StudentState,
} from '../state';
import { formatV2WorkspaceAmount, parseV2WorkspaceAmount } from './format';
import type {
  V2CheckpointFieldPresentation,
  V2CheckpointSectionPresentation,
} from './checkpointPresentation';

interface SectionProps {
  readonly source: V2SourceCase;
  readonly state: V2StudentState;
  readonly presentation: V2CheckpointSectionPresentation;
  readonly status: V2GradingStatus;
  readonly values: Readonly<Record<string, string>>;
  readonly onEdit: (
    sectionId: V2AmountCheckpointSectionId,
    field: V2CheckpointAmountField,
    rawAmount: string,
  ) => void;
  readonly onCheck: (sectionId: V2AmountCheckpointSectionId) => void;
}

function parsed(values: Readonly<Record<string, string>>, field: V2CheckpointAmountField): number | null {
  return parseV2WorkspaceAmount(values[field] ?? '');
}

function sum(
  values: Readonly<Record<string, string>>,
  fields: readonly V2CheckpointAmountField[],
): number | null {
  const amounts = fields.map(field => parsed(values, field));
  if (amounts.some(amount => amount === null)) return null;
  return amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
}

function amount(value: number | null): string {
  return value === null ? '—' : formatV2WorkspaceAmount(value);
}

function Field({ sectionId, item, raw, locked, onEdit, label }: {
  readonly sectionId: V2AmountCheckpointSectionId;
  readonly item: V2CheckpointFieldPresentation;
  readonly raw: string;
  readonly locked: boolean;
  readonly onEdit: SectionProps['onEdit'];
  readonly label?: string;
}) {
  const value = parseV2WorkspaceAmount(raw);
  const id = 'l2v2-checkpoint-' + sectionId + '-' + item.field;
  return <div className="l2v2-checkpoint-field">
    <label htmlFor={id}>{label ?? item.label}</label>
    {locked
      ? <strong>{value === null ? raw : formatV2WorkspaceAmount(value)}</strong>
      : <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="Beløb"
        value={raw}
        onChange={event => onEdit(sectionId, item.field, event.target.value)}
      />}
  </div>;
}

function SectionHeader({ presentation, locked }: {
  readonly presentation: V2CheckpointSectionPresentation;
  readonly locked: boolean;
}) {
  return <header>
    <span className="l2v2-section-letter" aria-hidden="true">{presentation.sectionId}</span>
    <h2 id={'l2v2-checkpoint-' + presentation.sectionId}>{presentation.title}</h2>
    {locked && <strong className="l2v2-correct">✓ Korrekt</strong>}
  </header>;
}

function FeedbackAndAction({ presentation, status, onCheck }: {
  readonly presentation: V2CheckpointSectionPresentation;
  readonly status: V2GradingStatus;
  readonly onCheck: SectionProps['onCheck'];
}) {
  const locked = status === 'correct';
  return <>
    {status === 'incorrect' && <p className="l2v2-feedback l2v2-incorrect" role="status">
      Kontrollér dine beregninger og prøv igen.
    </p>}
    {!locked && <button type="button" className="l2v2-primary" onClick={() => onCheck(presentation.sectionId)}>
      Kontrollér sektion {presentation.sectionId}
    </button>}
  </>;
}

function SourceGroup({ title, children }: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return <div className="l2v2-source-group">
    <h3>{title}</h3>
    {children}
  </div>;
}

function LiveMetric({ label, value, detail, status }: {
  readonly label: string;
  readonly value: number | null;
  readonly detail?: string;
  readonly status?: V2GradingStatus;
}) {
  return <div className="l2v2-live-metric">
    <span>{label}</span>
    <output>{amount(value)}</output>
    {detail && <small>{detail}</small>}
    {status === 'correct' && <strong className="l2v2-correct">✓ Stemmer</strong>}
  </div>;
}

function GrossSection(props: SectionProps) {
  const { presentation, status, values, onEdit, onCheck } = props;
  const locked = status === 'correct';
  const field = (name: V2CheckpointAmountField, label?: string) => {
    const item = presentation.fields.find(candidate => candidate.field === name);
    if (!item) throw new Error('Missing checkpoint field ' + name);
    return <Field sectionId={presentation.sectionId} item={item} raw={values[name] ?? ''} locked={locked} onEdit={onEdit} label={label} />;
  };
  const gross = sum(values, ['wageAccountYtd', 'employeePensionYtd', 'employeeAtpYtd']);
  const payrollTally = parsed(values, 'calculatedGrossPayYtd');
  const difference = gross === null || payrollTally === null ? null : gross - payrollTally;
  const wageAccount = presentation.sectionId === 'A' ? '2210' : '2211';
  const tallyLabel = presentation.sectionId === 'A'
    ? 'Bruttoløn ÅTD – timelønnede – tælleværk'
    : 'Bruttoløn ÅTD – månedslønnede – tælleværk';
  return <section
    className={'l2v2-checkpoint-section l2v2-gross-section l2v2-section-' + status}
    data-checkpoint-card={presentation.sectionId}
    aria-labelledby={'l2v2-checkpoint-' + presentation.sectionId}
  >
    <SectionHeader presentation={presentation} locked={locked} />
    <div className="l2v2-gross-flow">
      <SourceGroup title="Fra bogføringen / T-konto">
        {field('wageAccountYtd')}
      </SourceGroup>
      <SourceGroup title="Fra lønsystemets tælleværker">
        {field('employeePensionYtd')}
        {field('employeeAtpYtd')}
      </SourceGroup>
      <SourceGroup title="Beregnet bruttoløn ÅTD">
        <LiveMetric
          label="Beregnet bruttoløn ÅTD"
          value={gross}
          detail={wageAccount + ' + medarbejderpension + medarbejder-ATP'}
        />
      </SourceGroup>
      <SourceGroup title="Fra lønsystemets tælleværker">
        {field('calculatedGrossPayYtd', tallyLabel)}
      </SourceGroup>
      <SourceGroup title="Difference">
        <LiveMetric label="Beregnet bruttoløn minus bruttoløn ÅTD" value={difference} status={status} />
      </SourceGroup>
    </div>
    <FeedbackAndAction presentation={presentation} status={status} onCheck={onCheck} />
  </section>;
}

const C_GROUPS = [
  {
    id: 'pension',
    title: 'Pension',
    bookField: 'pensionBookBalance',
    counterFields: [
      'hourlyEmployeePensionYtd',
      'hourlyEmployerPensionYtd',
      'salariedEmployeePensionYtd',
      'salariedEmployerPensionYtd',
    ],
  },
  {
    id: 'atp',
    title: 'ATP',
    bookField: 'atpBookBalance',
    counterFields: [
      'hourlyEmployeeAtpYtd',
      'hourlyEmployerAtpYtd',
      'salariedEmployeeAtpYtd',
      'salariedEmployerAtpYtd',
    ],
  },
] as const satisfies readonly {
  readonly id: string;
  readonly title: string;
  readonly bookField: V2CheckpointAmountField;
  readonly counterFields: readonly V2CheckpointAmountField[];
}[];

function OtherCostSection(props: SectionProps) {
  const { presentation, status, values, onEdit, onCheck } = props;
  const locked = status === 'correct';
  const field = (name: V2CheckpointAmountField) => {
    const item = presentation.fields.find(candidate => candidate.field === name);
    if (!item) throw new Error('Missing checkpoint field ' + name);
    return <Field sectionId="C" item={item} raw={values[name] ?? ''} locked={locked} onEdit={onEdit} />;
  };
  const group = (definition: typeof C_GROUPS[number]) => {
    const counters = sum(values, definition.counterFields);
    const booked = parsed(values, definition.bookField);
    const difference = booked === null || counters === null ? null : booked - counters;
    return <section
      className="l2v2-reconciliation-group"
      data-reconciliation-group={definition.id}
      aria-labelledby={'l2v2-c-' + definition.id}
      key={definition.id}
    >
      <h3 id={'l2v2-c-' + definition.id}>{definition.title}</h3>
      <SourceGroup title="Fra bogføringen / T-konto">{field(definition.bookField)}</SourceGroup>
      <SourceGroup title="Fra lønsystemets tælleværker">
        {definition.counterFields.map(counterField => <div key={counterField}>{field(counterField)}</div>)}
      </SourceGroup>
      {locked && <LiveMetric label="Bogført saldo" value={booked} />}
      <LiveMetric label="Sum af tælleværker" value={counters} />
      <LiveMetric label="Difference" value={difference} detail="Bogført saldo minus sum af tælleværker" status={status} />
    </section>;
  };
  const holidayBook = parsed(values, 'holidayPayBookBalance');
  const holidayCounter = parsed(values, 'holidayPayGrossYtd');
  const holidayDifference = holidayBook === null || holidayCounter === null
    ? null
    : holidayBook - holidayCounter;
  return <section
    className={'l2v2-checkpoint-section l2v2-other-cost-section l2v2-section-' + status}
    data-checkpoint-card="C"
    aria-labelledby="l2v2-checkpoint-C"
  >
    <SectionHeader presentation={presentation} locked={locked} />
    <div className="l2v2-c-main-groups">
      {C_GROUPS.map(group)}
    </div>
    <section
      className="l2v2-reconciliation-group l2v2-holiday-group"
      data-reconciliation-group="holiday"
      aria-labelledby="l2v2-c-holiday"
    >
      <h3 id="l2v2-c-holiday">Feriepenge – timelønnede</h3>
      <div className="l2v2-holiday-fields">
        <SourceGroup title="Fra bogføringen / T-konto">{field('holidayPayBookBalance')}</SourceGroup>
        <SourceGroup title="Fra lønsystemets tælleværker">{field('holidayPayGrossYtd')}</SourceGroup>
      </div>
      {locked && <>
        <LiveMetric label="Bogført saldo" value={holidayBook} />
        <LiveMetric label="Tælleværk" value={holidayCounter} />
      </>}
      <LiveMetric label="Difference" value={holidayDifference} detail="Bogført saldo minus bruttoferiepenge ÅTD" status={status} />
    </section>
    <FeedbackAndAction presentation={presentation} status={status} onCheck={onCheck} />
  </section>;
}

function GenericSection(props: SectionProps) {
  const { presentation, status, values, onEdit, onCheck } = props;
  const locked = status === 'correct';
  return <section className={'l2v2-checkpoint-section l2v2-section-' + status} aria-labelledby={'l2v2-checkpoint-' + presentation.sectionId}>
    <SectionHeader presentation={presentation} locked={locked} />
    {presentation.relationship && <p className="l2v2-relationship">{presentation.relationship}</p>}
    <div className="l2v2-checkpoint-fields">
      {presentation.fields.map(item => <Field
        key={item.field}
        sectionId={presentation.sectionId}
        item={item}
        raw={values[item.field] ?? ''}
        locked={locked}
        onEdit={onEdit}
      />)}
    </div>
    <FeedbackAndAction presentation={presentation} status={status} onCheck={onCheck} />
    {locked && presentation.sectionId === 'D' && <section className="l2v2-internal-control" aria-label="Internt kontrolresultat">
      <span>Sum af driftskonti</span>
      <strong>{formatV2WorkspaceAmount(parseV2WorkspaceAmount(values.operatingTotal) ?? 0)}</strong>
      <p className="l2v2-correct">✓ Intern kontrol stemmer</p>
    </section>}
  </section>;
}

export function V2CheckpointSection(props: SectionProps) {
  if (props.presentation.sectionId === 'A' || props.presentation.sectionId === 'B') {
    return <GrossSection {...props} />;
  }
  if (props.presentation.sectionId === 'C') return <OtherCostSection {...props} />;
  return <GenericSection {...props} />;
}
