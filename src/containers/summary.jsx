import React, { Component } from 'react';
import ReactInterval from 'react-interval';

import Summary from '../components/summary';
import ChangesetFilter from '../components/changesetFilter';
import GenericErrorMessage from '../components/genericErrorMessage';
import settings from '../settings';
import { pollPendingChangesets } from '../utils/coverage';
import { loadCoverageData } from '../utils/data';

const { LOADING } = settings.STRINGS;

const PollingStatus = ({ pollingEnabled }) => (
  (pollingEnabled) ? (
    <div className="polling-status"> {pollingEnabled}
      Some changesets are still being processed and we are actively
      polling them until we get a result.
    </div>) : (null)
);

export default class SummaryContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: '',
      changesets: {},
      changesetsCoverage: {},
      descriptionFilterValue: '',
      pollingEnabled: false, // We don't start polling until we're ready
      timeout: 10000, // How often we poll for csets w/o coverage status
    };
    this.onFilterByDescription = this.onFilterByDescription.bind(this);
  }

  async componentDidMount() {
    this.initializeData();
  }

  onFilterByDescription(event) {
    event.preventDefault();
    this.setState({ descriptionFilterValue: event.target.value });
  }

  async initializeData() {
    try {
      // This will either fetch the data or grab it from the cache
      const { changesets, changesetsCoverage, summary } = await loadCoverageData();
      this.setState({
        changesets,
        changesetsCoverage,
        pollingEnabled: summary.pending > 0,
      });
    } catch (error) {
      console.error(error);
      this.setState({
        changesets: {},
        changesetsCoverage: {},
        pollingEnabled: false,
        errorMessage: 'We have failed to fetch coverage data.',
      });
    }
  }

  // We poll on an interval for coverage for csets without it
  async pollPending(coverage) {
    try {
      const { changesetsCoverage, pollingEnabled } = await pollPendingChangesets(coverage);
      this.setState({ changesetsCoverage, pollingEnabled });
    } catch (e) {
      this.setState({ pollingEnabled: false });
    }
  }

  render() {
    const {
      changesets,
      changesetsCoverage,
      descriptionFilterValue,
      errorMessage,
      pollingEnabled,
      timeout,
    } = this.state;

    if (errorMessage) {
      return (<div className="error-message">{errorMessage}</div>);
    }

    const ready =
      Object.keys(changesets).length > 0 &&
      Object.keys(changesetsCoverage).length > 0;

    return (
      <div>
        {pollingEnabled && (
          <div>
            <ReactInterval
              timeout={timeout}
              enabled={pollingEnabled}
              callback={() => this.pollPending(changesetsCoverage)}
            />
            <PollingStatus
              pollingEnabled={pollingEnabled}
            />
          </div>
        )}
        <ChangesetFilter
          value={descriptionFilterValue}
          onChange={this.onFilterByDescription}
        />
        {ready && (
          <Summary
            changesets={changesets}
            changesetsCoverage={changesetsCoverage}
          />
        )}
        {!pollingEnabled && ready &&
          <GenericErrorMessage />
        }
        {!pollingEnabled &&
          (<h3 className="loading">{LOADING}</h3>)
        }
      </div>
    );
  }
}
