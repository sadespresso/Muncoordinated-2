import * as React from 'react';
import * as firebase from 'firebase';
import Committee, { CommitteeData, URLParameters } from './Committee';
import { RouteComponentProps } from 'react-router';
import { Table, Loader, Flag  } from 'semantic-ui-react';
import { MemberData, MemberID, parseFlagName } from './Member';
import { CaucusID, CaucusData, SpeakerEvent } from './Caucus';

interface Props extends RouteComponentProps<URLParameters> {
}

interface State {
  committee?: CommitteeData;
  committeeFref: firebase.database.Reference;
}

export default class Stats extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { match } = props;

    this.state = {
      committeeFref: firebase
        .database()
        .ref('committees')
        .child(match.params.committeeID)
    };
  }

  firebaseCallback = (committee: firebase.database.DataSnapshot | null) => {
    if (committee) {
      this.setState({ committee: committee.val() });
    }
  }

  componentDidMount() {
    this.state.committeeFref.on('value', this.firebaseCallback);
  }

  componentWillUnmount() {
    this.state.committeeFref.off('value', this.firebaseCallback);
  }

  timesSpokenInCommitee(committee: CommitteeData, memberID: MemberID, member: MemberData) {
    const caucuses = committee.caucuses || {} as Map<CaucusID, CaucusData>;

    let times = 0;

    Object.keys(caucuses).forEach(cid => {
      const caucus: CaucusData = caucuses[cid];

      const history = caucus.history || {} as Map<string, SpeakerEvent>;
      
      Object.keys(history).map(hid => history[hid]).forEach((speakerEvent: SpeakerEvent) => {
        if (speakerEvent.who === member.name) { // I fucked up and used name in SpeakerEvent, not MemberID
          times += 1;
        }
      }
      );
    });

    return times;
  }

  renderCommittee = (committee: CommitteeData) => {
    const { timesSpokenInCommitee } = this;

    const members = committee.members || {} as Map<MemberID, MemberData>;

    const rows = Object.keys(members).sort((mida, midb) => {
      // FIXME: filthy disgusting hack, probaly bring in Lodash and sortBy or something
      // Written in debate

      const a = timesSpokenInCommitee(committee, mida, members[mida]);
      const b = timesSpokenInCommitee(committee, midb, members[midb]);

      if (a < b) {
        return 1; // reversed
      } else if (a === b) {
        return 0;
      } else {
        return -1;
      }
    }).map(mid => {
      const member = members[mid];

      return (
        <Table.Row key={mid} >
          <Table.Cell>
            <Flag name={parseFlagName(member.name) as any} />
            {member.name}
          </Table.Cell>
          <Table.Cell>
            {timesSpokenInCommitee(committee, mid, member)}
          </Table.Cell>
        </Table.Row>
      );
    });

    return (
      <Table compact celled definition>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell />
            <Table.HeaderCell>Times Spoken</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {rows}
        </Table.Body>
      </Table>
    );
  }

  render() {
    const { committee } = this.state;

    if (committee) {
      return this.renderCommittee(committee);
    } else {
      return <Loader>Loading</Loader>;
    }
  }
}  