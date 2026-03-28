document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const loadSampleBtn = document.getElementById('loadSampleBtn');
    const dashboard = document.getElementById('dashboard');
    const tableBody = document.getElementById('tableBody');
    const npsFilter = document.getElementById('npsFilter');
    const activeFiltersContainer = document.getElementById('activeFilters');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // State
    const appState = {
        allData: [],
        filters: { nps: 'all', sentiment: null, topic: null }
    };

    // Chart instances
    let sentimentChartInstance = null;
    let topicChartInstance = null;

    // --- Simple NLP Logic ---
    // In a real production app, this would call an API or use a more robust ML library
    const dictionaries = {
        positive: ['love', 'great', 'recommend', 'quickly', 'affordable', 'good', 'awesome', 'amazing', 'happy', 'best', 'excellent'],
        negative: ['slow', 'cold', 'twice', 'refund', 'confusing', 'long', 'high', 'issue', 'bad', 'poor', 'terrible', 'worst', 'angry'],
        topics: {
            'Service': ['service', 'slow', 'cold', 'staff', 'support', 'shipping', 'long', 'resolved', 'wait', 'delivery'],
            'Price': ['pricing', 'affordable', 'charged', 'refund', 'prices', 'high', 'money', 'cost', 'expensive', 'cheap'],
            'Product/UI': ['product', 'ui', 'quality', 'app', 'website', 'interface', 'feature', 'broken', 'bug']
        }
    };

    function analyzeText(text) {
        const lowerText = text.toLowerCase();
        
        // Determine Sentiment
        let posCount = 0;
        let negCount = 0;
        
        dictionaries.positive.forEach(word => { if (lowerText.includes(word)) posCount++; });
        dictionaries.negative.forEach(word => { if (lowerText.includes(word)) negCount++; });

        let sentiment = 'Neutral';
        if (posCount > negCount) sentiment = 'Positive';
        else if (negCount > posCount) sentiment = 'Negative';

        // Determine Topic
        let dominantTopic = 'Other';
        let maxTopicCount = 0;

        for (const [topic, words] of Object.entries(dictionaries.topics)) {
            let count = 0;
            words.forEach(word => { if (lowerText.includes(word)) count++; });
            if (count > maxTopicCount) {
                maxTopicCount = count;
                dominantTopic = topic;
            }
        }

        return { sentiment, topic: dominantTopic };
    }

    // --- Event Listeners ---
    
    // Drag and Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File Input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    // Load Sample Data (using hardcoded string for offline support)
    loadSampleBtn.addEventListener('click', () => {
        const sampleCSV = `response ID,EMAIL,NPS SCORE,NPS COMMENT
1,john@example.com,2,The service was incredibly slow and the food was cold.
2,alice@example.com,9,I love the new pricing, very affordable!
3,bob@example.com,7,The staff was okay, nothing special.
4,carol@example.com,1,My account was charged twice, I need a refund immediately!
5,dave@example.com,10,Great product, highly recommend it to everyone.
6,eve@example.com,5,The UI is a bit confusing but I managed to figure it out.
7,frank@example.com,3,Shipping took way too long.
8,grace@example.com,2,Prices are too high for this quality.
9,heidi@example.com,8,Customer support resolved my issue quickly.
10,ivan@example.com,6,I don't have any strong opinions about this service.`;

        Papa.parse(sampleCSV, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processData(results.data);
            }
        });
    });

    function handleFile(file) {
        if (!file.name.endsWith('.csv')) {
            alert('Please upload a valid CSV file.');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processData(results.data);
            },
            error: function(err) {
                alert('Error parsing CSV: ' + err.message);
            }
        });
    }

    function processData(data) {
        if (!data || data.length === 0) {
            alert("No data found in file.");
            return;
        }

        // Find columns (case-insensitive search)
        const keys = Object.keys(data[0]);
        let commentKey = keys.find(k => k.toLowerCase().includes('nps comment') || k.toLowerCase().includes('comment'));
        let idKey = keys.find(k => k.toLowerCase().includes('response id') || k.toLowerCase().includes('id'));
        let emailKey = keys.find(k => k.toLowerCase().includes('email'));
        let npsKey = keys.find(k => k.toLowerCase().includes('nps score') || k.toLowerCase().includes('nps'));
        
        if (!commentKey) {
            alert('Could not find an "NPS COMMENT" column. Found columns: ' + keys.join(', '));
            return;
        }

        appState.allData = data.map(row => {
            const comment = row[commentKey] || '';
            const analysis = analyzeText(comment);
            return {
                id: row[idKey] || '-',
                email: row[emailKey] || '-',
                npsScore: row[npsKey] || '-',
                comment: comment,
                sentiment: row.Sentiment || analysis.sentiment,
                topic: row.Topic || analysis.topic
            };
        });

        applyFiltersAndRender(true);
    }

    // UI Event Listeners for Filters
    if (npsFilter) {
        npsFilter.addEventListener('change', (e) => {
            appState.filters.nps = e.target.value;
            applyFiltersAndRender(false);
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            appState.filters = { nps: 'all', sentiment: null, topic: null };
            if (npsFilter) npsFilter.value = 'all';
            applyFiltersAndRender(false);
        });
    }

    window.clearSpecificFilter = function(fType) {
        appState.filters[fType] = null;
        applyFiltersAndRender(false);
    };

    function applyFiltersAndRender(scrollToDash = false) {
        if (appState.allData.length === 0) return;
        dashboard.classList.remove('hidden');

        // Apply NPS filter manually across whole dataset
        let npsFiltered = appState.allData.filter(item => {
            let val = parseFloat(item.npsScore);
            if (appState.filters.nps === 'promoters') return val >= 9;
            if (appState.filters.nps === 'passives') return val >= 7 && val <= 8;
            if (appState.filters.nps === 'detractors') return val <= 6;
            return true;
        });

        let stats = { total: npsFiltered.length, positive: 0, negative: 0, neutral: 0, topics: {} };
        npsFiltered.forEach(item => {
            stats[item.sentiment.toLowerCase()]++;
            stats.topics[item.topic] = (stats.topics[item.topic] || 0) + 1;
        });

        document.getElementById('totalComments').innerText = stats.total;
        document.getElementById('positivePerc').innerText = stats.total ? Math.round((stats.positive / stats.total) * 100) + '%' : '0%';
        document.getElementById('negativePerc').innerText = stats.total ? Math.round((stats.negative / stats.total) * 100) + '%' : '0%';

        renderCharts(stats);

        // Filter Table by chart selections
        let tableData = npsFiltered.filter(item => {
            let sMatch = appState.filters.sentiment ? item.sentiment === appState.filters.sentiment : true;
            let tMatch = appState.filters.topic ? item.topic === appState.filters.topic : true;
            return sMatch && tMatch;
        });

        renderTable(tableData);
        renderActiveFiltersUI();

        if (scrollToDash) dashboard.scrollIntoView({ behavior: 'smooth' });
    }

    function renderActiveFiltersUI() {
        if (!activeFiltersContainer) return;
        activeFiltersContainer.innerHTML = '';
        const { sentiment, topic } = appState.filters;
        let hasFilter = false;

        if (sentiment) {
            hasFilter = true;
            let cls = sentiment === 'Positive' ? 'badge-positive' : sentiment === 'Negative' ? 'badge-negative' : 'badge-neutral';
            activeFiltersContainer.innerHTML += `<span class="badge ${cls}" style="cursor:pointer" onclick="clearSpecificFilter('sentiment')">${sentiment} ✖</span>`;
        }
        if (topic) {
            hasFilter = true;
            activeFiltersContainer.innerHTML += `<span class="badge badge-topic" style="cursor:pointer" onclick="clearSpecificFilter('topic')">${topic} ✖</span>`;
        }

        clearFiltersBtn.style.display = (hasFilter || appState.filters.nps !== 'all') ? 'block' : 'none';
    }

    function renderTable(data) {
        tableBody.innerHTML = '';

        data.forEach(item => {
            const tr = document.createElement('tr');
            
            let sentimentClass = 'badge-neutral';
            if (item.sentiment === 'Positive') sentimentClass = 'badge-positive';
            if (item.sentiment === 'Negative') sentimentClass = 'badge-negative';

            let npsClass = 'badge-neutral';
            let npsVal = parseFloat(item.npsScore);
            if (!isNaN(npsVal)) {
                if (npsVal >= 9) npsClass = 'badge-positive';
                else if (npsVal <= 6) npsClass = 'badge-negative';
            }
            
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.email}</td>
                <td><span class="badge ${npsClass}">${item.npsScore}</span></td>
                <td>${item.comment}</td>
                <td><span class="badge ${sentimentClass}">${item.sentiment}</span></td>
                <td><span class="badge badge-topic">${item.topic}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function renderCharts(stats) {
        // Chart Configs
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#f8fafc', padding: 20, font: { family: "'Inter', sans-serif" } }
                }
            }
        };

        // Sentiment Chart
        const sentimentCtx = document.getElementById('sentimentChart').getContext('2d');
        if (sentimentChartInstance) sentimentChartInstance.destroy();
        
        sentimentChartInstance = new Chart(sentimentCtx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Negative', 'Neutral'],
                datasets: [{
                    data: [stats.positive, stats.negative, stats.neutral],
                    backgroundColor: ['#10b981', '#ef4444', '#94a3b8'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                ...commonOptions,
                cutout: '70%',
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;
                        appState.filters.sentiment = chart.data.labels[dataIndex];
                        applyFiltersAndRender(false);
                    }
                },
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleFont: { family: "'Inter', sans-serif" },
                        bodyFont: { family: "'Inter', sans-serif" },
                        padding: 12,
                        cornerRadius: 8
                    }
                }
            }
        });

        // Topic Chart
        const topicCtx = document.getElementById('topicChart').getContext('2d');
        if (topicChartInstance) topicChartInstance.destroy();

        const topicLabels = Object.keys(stats.topics);
        const topicData = Object.values(stats.topics);

        topicChartInstance = new Chart(topicCtx, {
            type: 'bar',
            data: {
                labels: topicLabels,
                datasets: [{
                    label: 'Comments per Topic',
                    data: topicData,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                ...commonOptions,
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const dataIndex = activeElements[0].index;
                        appState.filters.topic = chart.data.labels[dataIndex];
                        applyFiltersAndRender(false);
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    ...commonOptions.plugins,
                    legend: { display: false }
                }
            }
        });
    }
});
