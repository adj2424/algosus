import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Graph from './Graph';
import Table from './Table';

function App() {
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const url = 'http://127.0.0.1:5001/algosus/us-central1/fetch';
      await fetch(url)
        .then(response => response.json())
        .then(data => {
          //setAccount(data.account);
          //setBuy(data.buy);
          //setSell(data.sell);
          setTimeline(Object.values(data.timeline));
        })
        .catch(err => console.log(err));
    };
    fetchData();
  }, []);

  return (
    <div className="App">
      <p>hi</p>
      <Graph timeline={timeline} />
      <Table data={timeline} />
    </div>
  );
}

export default App;
