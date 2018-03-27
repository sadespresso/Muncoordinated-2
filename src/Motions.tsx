import * as React from 'react';
import * as firebase from 'firebase';
import { CommitteeData, URLParameters } from './Committee';
import { RouteComponentProps } from 'react-router';
import { Loader, Segment, Input, Dropdown, Button, Card, Form } from 'semantic-ui-react';
import { fieldHandler, dropdownHandler, numberFieldHandler } from './handlers';
import { makeDropdownOption, objectToList } from './utils';
import { TimerSetter, Unit } from "./TimerSetter";
import { parseCountryOption, MemberID, MemberData } from "./Member";
import { CountryOption } from "./common";

export type MotionID = string;

enum MotionType {
  OpenUnmoderatedCaucus = 'Open Unmoderated Caucus',
  OpenModeratedCaucus = 'Open Moderated Caucus',
  ExtendUnmoderatedCaucus = 'Extend Unmoderated Caucus',
  ExtendModeratedCaucus = 'Extend Moderated Caucus',
  CloseModeratedCaucus = 'Close Moderated Caucus',
  IntroduceDraftResolution = 'Introduce Draft Resolution',
  IntroduceAmendment = 'Introduce Amendment',
  SuspendDraftResolutionSpeakersList = 'Suspend Draft Resolution Speakers List',
  OpenDebate = 'Open Debate',
  SuspendDebate = 'Suspend Debate',
  ResumeDebate = 'Resume Debate',
  CloseDebate = 'Close Debate',
  ReorderDraftResolutions = 'Reorder Draft Resolutions'
}

const disruptiveness = (motionType: MotionType): number => {
  switch (motionType) {
    case MotionType.ExtendUnmoderatedCaucus:
      return 1
    case MotionType.ExtendModeratedCaucus:
    case MotionType.CloseModeratedCaucus:
      return 2
    case MotionType.OpenUnmoderatedCaucus:
      return 4
    case MotionType.OpenModeratedCaucus:
      return 5
    case MotionType.IntroduceDraftResolution:
      return 6
    case MotionType.IntroduceAmendment:
      return 7
    case MotionType.SuspendDraftResolutionSpeakersList:
      return 8
    case MotionType.OpenDebate:
    case MotionType.SuspendDebate:
    case MotionType.ResumeDebate:
    case MotionType.CloseDebate:
      return 9
    case MotionType.ReorderDraftResolutions:
      return 10
    default:
      return 69
  }
}

const approvable = (motionType: MotionType): boolean => {
  switch (motionType) {
    default:
      return false 
  }
}

const hasSpeakers = (motionType: MotionType): boolean => {
  switch (motionType) {
    case MotionType.OpenModeratedCaucus:
      return true
    default:
      return false 
  }
}

const hasDetail = (motionType: MotionType): boolean => {
  switch (motionType) {
    case MotionType.OpenModeratedCaucus:
    case MotionType.IntroduceDraftResolution:
    case MotionType.IntroduceAmendment:
      return true
    default:
      return false 
  }
}

const hasDuration = (motionType: MotionType): boolean => {
  switch (motionType) {
    case MotionType.ExtendUnmoderatedCaucus:
    case MotionType.ExtendModeratedCaucus:
    case MotionType.OpenModeratedCaucus:
    case MotionType.OpenUnmoderatedCaucus:
      return true
    default:
      return false 
  }
}

export interface MotionData {
  proposal: string;
  proposer: string;
  speakerDuration: number;
  speakerUnit: Unit;
  caucusDuration: number;
  caucusUnit: Unit;
  type: MotionType;
}

interface Props extends RouteComponentProps<URLParameters> {
}

interface State {
  committee?: CommitteeData;
  newMotion: MotionData;
  committeeFref: firebase.database.Reference;
}

const MOTION_TYPE_OPTIONS = [
  MotionType.OpenUnmoderatedCaucus,
  MotionType.OpenModeratedCaucus,
  MotionType.ExtendUnmoderatedCaucus,
  MotionType.ExtendModeratedCaucus,
  MotionType.CloseModeratedCaucus,
  MotionType.IntroduceDraftResolution,
  MotionType.IntroduceAmendment,
  MotionType.SuspendDraftResolutionSpeakersList,
  MotionType.OpenDebate,
  MotionType.SuspendDebate,
  MotionType.ResumeDebate,
  MotionType.CloseDebate,
  MotionType.ReorderDraftResolutions,
].map(makeDropdownOption);

const DEFAULT_MOTION: MotionData = {
  proposal: '',
  proposer: '',
  speakerDuration: 60,
  speakerUnit: Unit.Seconds,
  caucusDuration: 15,
  caucusUnit: Unit.Minutes,
  type: MotionType.OpenUnmoderatedCaucus // this will force it to the top of the list
};

export default class Motions extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { match } = props;

    this.state = {
      committeeFref: firebase.database().ref('committees').child(match.params.committeeID),
      newMotion: DEFAULT_MOTION
    };
  }

  componentDidMount() {
    this.state.committeeFref.on('value', (committee) => {
      if (committee) {
        this.setState({ committee: committee.val() });
      }
    });
  }

  componentWillUnmount() {
    this.state.committeeFref.off();
  }

  recoverCountryOptions = (): CountryOption[] => {
    const { committee } = this.state

    if (committee) {
      return objectToList(committee.members || {} as Map<MemberID, MemberData>)
        .map(x => parseCountryOption(x.name))
    }

    return []
  }

  handlePushMotion = (): void => {
    this.state.committeeFref.child('motions').push().set(DEFAULT_MOTION);
  }

  handleClearMotions = (): void => {
    this.state.committeeFref.child('motions').set({})
  }

  handleApproveMotion = (motionData: MotionData): void => {
  }

  renderMotion = (id: MotionID, motionData: MotionData, motionFref: firebase.database.Reference) => {
    const { recoverCountryOptions, handleApproveMotion } = this;
    const { proposer, proposal, type, caucusUnit, caucusDuration, speakerUnit, 
      speakerDuration } = motionData;

    const description = (
      <Card.Description>
        <Input 
          value={proposal}
          onChange={fieldHandler<MotionData>(motionFref, 'proposal')} 
          fluid 
        /> 
      </Card.Description>
    )

    const speakerSetter = (
      <TimerSetter
        unitValue={speakerUnit}
        durationValue={speakerDuration.toString()}
        onUnitChange={dropdownHandler<MotionData>(motionFref, 'speakerUnit')}
        onDurationChange={numberFieldHandler<MotionData>(motionFref, 'speakerDuration')}
        label={"Speaker"}
      />
    )

    const durationSetter = (
      <TimerSetter
        unitValue={caucusUnit}
        durationValue={caucusDuration.toString()}
        onUnitChange={dropdownHandler<MotionData>(motionFref, 'caucusUnit')}
        onDurationChange={numberFieldHandler<MotionData>(motionFref, 'caucusDuration')}
        label={"Duration"}
      />
    )

    const extra = (
      <Card.Content extra>
        <Form>
          <Form.Group widths='equal'>
            { hasDuration(type) && durationSetter }
            { hasSpeakers(type) && speakerSetter }
          </Form.Group>
        </Form>
      </Card.Content>
    )

    return (
      <Card 
        key={id}
      >
        <Card.Content>
          <Card.Header>
            <Dropdown
              placeholder="Select type"
              search
              selection
              fluid
              options={MOTION_TYPE_OPTIONS}
              onChange={dropdownHandler<MotionData>(motionFref, 'type')}
              value={type}
            />
            { hasDetail(type) && description }
          </Card.Header>
          <Card.Meta>
            <Form.Dropdown
              value={proposer}
              search
              selection
              fluid
              onChange={dropdownHandler<MotionData>(motionFref, 'proposer')}
              options={recoverCountryOptions()}
              label="Proposer"
            />
          </Card.Meta>
        </Card.Content>
        { (hasSpeakers(type) || hasDuration(type)) && extra }
        <Card.Content extra>
          <Button.Group fluid>
            <Button 
              icon="trash" 
              basic 
              negative
              onClick={() => motionFref.remove()}
            >
              Delete
            </Button>
            { approvable(type) && <Button.Or /> }
            { approvable(type) && <Button 
              icon="checkmark" 
              basic 
              positive
              onClick={() => handleApproveMotion(motionData)}
            >
              Approve
            </Button> }
          </Button.Group>
        </Card.Content>
      </Card>
    );
  }

  renderMotions = (motions: Map<MotionID, MotionData>) => {
    const { renderMotion } = this;
    const { committeeFref } = this.state;

    return Object.keys(motions).sort((a, b) => {
      // don't like non-descriptive variable names? suck it
      const ma: MotionData = motions[a]
      const mb: MotionData = motions[b]
      const ca = disruptiveness(ma.type);
      const cb = disruptiveness(ma.type);

      if (ca < cb) {
        return -1; // reversed
      } else if (ca === cb) {

        const sa = ma.caucusDuration * (ma.caucusUnit === Unit.Minutes ? 60 : 1)
        const sb = mb.caucusDuration * (mb.caucusUnit === Unit.Minutes ? 60 : 1)

        // FIXME: Could be replaced by some sort of comapre function that I know exists
        if (sa < sb) {
          return 1
        } else if (sa === sb) {
          return 0
        } else {
          return -1
        }
      } else {
        return 1;
      }
    }).map(key => {
      return renderMotion(key, motions[key], committeeFref.child('motions').child(key));
    });
  }

  renderTab = (committee: CommitteeData) => {
    const { renderMotions } = this;
    const { handlePushMotion, handleClearMotions } = this;

    const motions = committee.motions || {} as Map<MotionID, MotionData>;

    const adder = (
      <Card>
        <Card.Content>
          <Button
            icon="plus"
            primary
            fluid
            basic
            onClick={handlePushMotion}
          />
        </Card.Content>
      </Card>
    )

    return (
      <div>
        <Card.Group
          itemsPerRow={1} 
        >
          { adder }
          { renderMotions(motions) }
        </Card.Group>
      </div>
    );
  }

  render() {
    const { committee } = this.state;

    if (committee) {
      return this.renderTab(committee);
    } else {
      return <Loader>Loading</Loader>;
    }
  }
}