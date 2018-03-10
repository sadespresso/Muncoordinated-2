import * as React from 'react';
import * as firebase from 'firebase';
import { CommitteeData, CommitteeID } from './Committee';
import { MemberView, MemberData, MemberID, Rank, parseFlagName } from './Member';
import * as Utils from './utils';
import { Dropdown, Segment, Header, Flag, Table, List, Button, Checkbox, Icon } from 'semantic-ui-react';
import { COUNTRY_OPTIONS, CountryOption } from './common';

interface Props {
  committee: CommitteeData;
  fref: firebase.database.Reference;
}

interface State {
  newCountry: CountryOption;
  newOptions: CountryOption[];
  newMemberRank: Rank;
  newMemberVoting: MemberData['voting'];
  newMemberPresent: MemberData['present'];
}

const RANK_OPTIONS = [
  { key: Rank.Standard, value: Rank.Standard, text: Rank.Standard },
  { key: Rank.Veto, value: Rank.Veto, text: Rank.Veto },
  { key: Rank.NGO, value: Rank.NGO, text: Rank.NGO },
  { key: Rank.Observer, value: Rank.Observer, text: Rank.Observer }
];

function CommitteeStats(props: { data: CommitteeData }) {
  const membersMap = props.data.members ? props.data.members : {} as Map<string, MemberData>;
  const members: MemberData[] = Utils.objectToList(membersMap);
  const present = members.filter(x => x.present);

  const delegatesNo: number = members.length;
  const presentNo: number = present.length;

  const canVote = (x: MemberData) => (x.rank === Rank.Veto || x.rank === Rank.Standard) && x.voting;
  const votingNo: number = present.filter(canVote).length;

  const quorum: number = Math.ceil(delegatesNo * 0.5);
  const hasQuorum: boolean = presentNo >= quorum;
  const draftResolution: number = Math.ceil(votingNo * 0.25);
  const amendment: number = Math.ceil(votingNo * 0.1);

  return (
    <Table definition>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell />
          <Table.HeaderCell>Number</Table.HeaderCell>
          <Table.HeaderCell>Description</Table.HeaderCell>
          <Table.HeaderCell>Threshold</Table.HeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        <Table.Row>
          <Table.Cell>Total</Table.Cell>
          <Table.Cell>{delegatesNo.toString()}</Table.Cell>
          <Table.Cell>Delegates in committee</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Present</Table.Cell>
          <Table.Cell>{presentNo.toString()}</Table.Cell>
          <Table.Cell>Delegates in attendance</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Voting</Table.Cell>
          <Table.Cell>{votingNo.toString()}</Table.Cell>
          <Table.Cell>Delegates with voting rights</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell error={!hasQuorum}>Debate</Table.Cell>
          <Table.Cell error={!hasQuorum}>{quorum.toString()}</Table.Cell>
          <Table.Cell error={!hasQuorum}>Delegates needed for debate</Table.Cell>
          <Table.Cell error={!hasQuorum}>50% of total</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Draft resolution</Table.Cell>
          <Table.Cell>{draftResolution.toString()}</Table.Cell>
          <Table.Cell>Delegates needed to table a draft resolution</Table.Cell>
          <Table.Cell>25% of voting</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Amendment</Table.Cell>
          <Table.Cell>{amendment.toString()}</Table.Cell>
          <Table.Cell>Delegates needed to table an amendment</Table.Cell>
          <Table.Cell>10% of voting</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}

function MemberItem(props: { data: MemberData, fref: firebase.database.Reference }) {
  const propertyHandler = (property: string) => (event: any, data: any) => {
    props.fref.child(property).set(data.checked);
  };

  const rankHandler = (event: any, data: any) => {
    props.fref.child('rank').set(data.value);
  };

  return (
    <Table.Row>
      <Table.Cell>
        <Flag name={parseFlagName(props.data.name) as any} />
        {props.data.name}
      </Table.Cell>
      <Table.Cell>
        <Dropdown
          search
          selection
          options={RANK_OPTIONS}
          onChange={rankHandler}
          value={props.data.rank}
        />
      </Table.Cell>
      <Table.Cell collapsing>
        <Checkbox 
          toggle 
          checked={props.data.present} 
          onChange={propertyHandler('present')} 
        />
      </Table.Cell>
      <Table.Cell collapsing>
        <Checkbox 
          toggle 
          checked={props.data.present && props.data.voting} 
          onChange={propertyHandler('voting')} 
          disabled={!props.data.present}
        />
      </Table.Cell>
      <Table.Cell>
        <Button
          icon
          labelPosition="left" 
          fluid
          negative
          size="small"
          onClick={() => props.fref.remove()}
        >
          <Icon name="trash" /> Delete
        </Button>
      </Table.Cell>
    </Table.Row>
  );
}

export default class CommitteeAdmin extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      newCountry: COUNTRY_OPTIONS[0],
      newOptions: [],
      newMemberRank: Rank.Standard,
      newMemberVoting: true,
      newMemberPresent: true
    };
  }

  pushMember = (event: any) => {
    event.preventDefault();

    const newMember: MemberData = {
      name: this.state.newCountry.text,
      rank: this.state.newMemberRank,
      present: this.state.newMemberPresent,
      voting: this.state.newMemberVoting
    };

    this.props.fref.child('members').push().set(newMember);
  }

  renderAdder() {
    const countryHandler = (event: any, data: any) => {
      this.setState({ 
        newCountry: [...this.state.newOptions, ...COUNTRY_OPTIONS].filter(c => c.value === data.value)[0] });
    };

    const presentHandler = (event: any, data: any) => {
      this.setState({ newMemberPresent: data.checked });
    };

    const votingHandler = (event: any, data: any) => {
      this.setState({ newMemberVoting: data.checked });
    };

    const rankHandler = (event: any, data: any) => {
      this.setState({ newMemberRank: data.value });
    };

    const additionHandler = (event: any, data: any) => {
      // FSM looks sorta like the UN flag
      const newOption: CountryOption = { key: data.value, text: data.value, value: data.value, flag: 'fm' };

      this.setState({ newCountry: newOption, newOptions: [ newOption, ...this.state.newOptions] });
    };

    return (
      <Table.Row>
        <Table.HeaderCell>
          <Dropdown
            placeholder="Select Country"
            search
            selection
            allowAdditions
            options={[...this.state.newOptions, ...COUNTRY_OPTIONS]}
            onAddItem={additionHandler}
            onChange={countryHandler}
            value={this.state.newCountry.value}
          />
        </Table.HeaderCell>
        <Table.HeaderCell>
          <Dropdown
            search
            selection
            options={RANK_OPTIONS}
            onChange={rankHandler}
            value={this.state.newMemberRank}
          />
        </Table.HeaderCell>
        <Table.HeaderCell collapsing >
          <Checkbox toggle checked={this.state.newMemberPresent} onChange={presentHandler} />
        </Table.HeaderCell>
        <Table.HeaderCell collapsing >
          <Checkbox toggle checked={this.state.newMemberVoting} onChange={votingHandler} />
        </Table.HeaderCell>
        <Table.HeaderCell>
          <Button 
            icon
            labelPosition="left" 
            fluid
            primary 
            size="small" 
            onClick={this.pushMember} 
          >
            <Icon name="user" /> Add
          </Button>
        </Table.HeaderCell>
      </Table.Row>
    );
  }

  CommitteeMembers = (props: { data: CommitteeData, fref: firebase.database.Reference }) => {

    const members = this.props.committee.members || {};
    const memberItems = Object.keys(members).map(key =>
      (
        <MemberItem
          key={key}
          data={members[key]}
          fref={props.fref.child('members').child(key)}
        />
      )
    );

    return (
      <Table compact celled definition>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell />
            <Table.HeaderCell>Rank</Table.HeaderCell>
            <Table.HeaderCell>Present</Table.HeaderCell>
            <Table.HeaderCell>Voting</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {memberItems}
        </Table.Body>

        <Table.Footer fullWidth>
        </Table.Footer>
      </Table>
    );
  }

  render() {
    return (
      <div>
        <Header as="h2" attached="top">Admin</Header>
        <Segment attached >
          <this.CommitteeMembers data={this.props.committee} fref={this.props.fref} />
        </Segment>
        <Header as="h2" attached="top">Stats</Header>
        <Segment attached >
          <CommitteeStats data={this.props.committee} />
        </Segment>
      </div>
    );
  }
}
