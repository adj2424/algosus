import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import './GraphHeader.css';

export const RANGES = ['1D', '1W', '1M', '1YR', 'ALL'] as const;
export type ChartRange = (typeof RANGES)[number];

export const RANGE_LABELS: Record<ChartRange, string> = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '1YR': 'Past year',
  ALL: 'All time'
};

type props = {
  timeline: any[];
  setTimeline: any;
  original: any[];
  activeRange: ChartRange;
  setActiveRange: (range: ChartRange) => void;
};

const GraphHeader = (props: props) => {
  const { setTimeline, original, activeRange, setActiveRange } = props;

  //returns in days
  const getDateDifference = (date1: Date, date2: Date) => {
    return Math.abs((date1.valueOf() - date2.valueOf()) / (1000 * 60 * 60 * 24));
  };

  //change timeline based on time range
  const setRange = (range: ChartRange) => {
    setActiveRange(range);
    let ranges: any[] = [];
    let difference = 1;
    if (range === '1D') {
      difference = 1;
    }
    //
    else if (range === '1W') {
      difference = 7;
    }
    //
    else if (range === '1M') {
      difference = 30;
    }
    //
    else if (range === '1YR') {
      difference = 365;
    }
    //
    else {
      setTimeline(original);
      return;
    }
    for (let i = original.length - 1; i >= 0; i--) {
      if (getDateDifference(new Date(), new Date(original[i].date)) <= difference) {
        ranges.push(original[i]);
      }
    }
    ranges = ranges.reverse();
    // edge case for 1 day
    if (ranges.length === 1) {
      const temp = {
        date: new Date().toString(),
        equity: ranges[0].equity
      };
      ranges.push(temp);
    }
    // edge case for 0 days meaning no data points are in range
    // will create two temporary points with latest equity
    if (ranges.length === 0 && original.length > 0) {
      const now = new Date();
      let temp = {
        date: now.toString(),
        equity: original[original.length - 1].equity
      };
      ranges.push(temp);
      temp = {
        date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toString(),
        equity: original[original.length - 1].equity
      };
      ranges.push(temp);
    }
    setTimeline(ranges);
  };

  return (
    <Stack className="graphHeader" direction="row" spacing={1}>
      <ButtonGroup variant="outlined" color="primary" aria-label="Chart time range">
        {RANGES.map(range => (
          <Button
            key={range}
            size="small"
            aria-pressed={activeRange === range}
            className={activeRange === range ? 'range-active' : ''}
            onClick={() => setRange(range)}
          >
            {range}
          </Button>
        ))}
      </ButtonGroup>
    </Stack>
  );
};

export default GraphHeader;
