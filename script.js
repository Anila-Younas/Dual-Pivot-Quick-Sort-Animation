const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const arrayInput = document.getElementById('arrayInput');
const arrayVisual = document.getElementById('arrayVisualization');
const viewBtn = document.getElementById('viewBtn');
const timerElement = document.getElementById('timer');

let array = [];
let sortGenerator = null;
let isPaused = true;
let animationFrameId = null;
let delay = 300;
let startTime = 0;
let useGraphView = false;
let sortInProgress = false;

// Initialize canvas
canvas.width = Math.min(window.innerWidth - 40, 1200);
canvas.height = 400;

function* dualPivotQuickSort(arr, left = 0, right = arr.length - 1) {
    if (left >= right) return;

    // Initial swap of pivots
    if (arr[left] > arr[right]) {
        [arr[left], arr[right]] = [arr[right], arr[left]];
        yield { arr: [...arr], action: 'swap', indexes: [left, right], pivots: [left, right] };
    }

    let lt = left + 1;
    let gt = right - 1;
    let i = left + 1;
    const pivot1 = arr[left];
    const pivot2 = arr[right];

    while (i <= gt) {
        yield { arr: [...arr], action: 'compare', indexes: [i], pivots: [left, right], pointers: { lt, gt, i } };

        if (arr[i] < pivot1) {
            [arr[i], arr[lt]] = [arr[lt], arr[i]];
            yield { arr: [...arr], action: 'swap', indexes: [i, lt], pivots: [left, right] };
            lt++;
            i++;
        } else if (arr[i] > pivot2) {
            [arr[i], arr[gt]] = [arr[gt], arr[i]];
            yield { arr: [...arr], action: 'swap', indexes: [i, gt], pivots: [left, right] };
            gt--;
        } else {
            i++;
        }
    }

    // Final swaps
    lt--;
    gt++;
    [arr[left], arr[lt]] = [arr[lt], arr[left]];
    [arr[right], arr[gt]] = [arr[gt], arr[right]];
    yield { arr: [...arr], action: 'final-swap', indexes: [lt, gt], pivots: [left, right] };

    yield* dualPivotQuickSort(arr, left, lt - 1);
    yield* dualPivotQuickSort(arr, lt + 1, gt - 1);
    yield* dualPivotQuickSort(arr, gt + 1, right);
}

function updateArrayVisualization(step) {
    const elements = step.arr.map((num, index) => {
        let classes = 'array-element';
        if (step.pivots?.includes(index)) classes += ' pivot';
        if (step.indexes?.includes(index)) classes += ' highlight';
        if (step.action === 'swap' && step.indexes?.includes(index)) classes += ' swap';
        
        return `
            <div class="element-container" style="position: relative;">
                <span class="${classes}">${num}</span>
                ${step.pointers && Object.entries(step.pointers).find(([_, v]) => v === index) ? 
                    `<div class="pointer-indicator">${
                        Object.entries(step.pointers)
                            .filter(([_, v]) => v === index)
                            .map(([k]) => k.toUpperCase())
                            .join('/')
                    }</div>` : ''}
            </div>
        `;
    }).join('');

    const stepDiv = document.createElement('div');
    stepDiv.className = 'array-step';
    
    // Add subarray boundaries
    const subarrayInfo = step.left !== undefined && step.right !== undefined ?
        `<div class="subarray">
            <div class="step-info">Processing subarray from index ${step.left} to ${step.right}</div>
            ${elements}
        </div>` : elements;

    stepDiv.innerHTML = `
        <div class="current-operation">
            ${getOperationDescription(step.action)}
        </div>
        ${subarrayInfo}
        ${step.pointers ? `
            <div class="step-info">
                Pointers:
                LT = ${step.pointers.lt}, 
                I = ${step.pointers.i}, 
                GT = ${step.pointers.gt}
            </div>
        ` : ''}
    `;

    arrayVisual.appendChild(stepDiv);
    arrayVisual.scrollTop = arrayVisual.scrollHeight;
}

function getOperationDescription(action) {
    const descriptions = {
        'compare': 'Comparing elements',
        'swap': 'Swapping elements',
        'final-swap': 'Final pivot positioning',
        'return': 'Returning from recursion'
    };
    return descriptions[action] || 'Processing';
}

function drawGraph(arr, step) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / arr.length;
    const maxValue = Math.max(...arr);
    const scale = canvas.height / maxValue;

    arr.forEach((value, index) => {
        // Set colors based on step state
        if (step.pivots?.includes(index)) {
            ctx.fillStyle = '#FF5722'; // Pivot color
        } else if (step.indexes?.includes(index)) {
            ctx.fillStyle = '#2196F3'; // Active element color
        } else {
            ctx.fillStyle = '#4CAF50'; // Default color
        }

        const barHeight = value * scale;
        ctx.fillRect(
            index * barWidth,
            canvas.height - barHeight,
            barWidth - 1,
            barHeight
        );

        // Add pointer indicators
        if (step.pointers) {
            Object.entries(step.pointers).forEach(([name, ptrIndex]) => {
                if (index === ptrIndex) {
                    ctx.fillStyle = '#FFC107';
                    ctx.font = '12px Arial';
                    ctx.fillText(name.toUpperCase(), index * barWidth + 5, canvas.height - 5);
                }
            });
        }
    });
}

function drawGraph(arr, step) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / arr.length;
    const maxValue = Math.max(...arr);
    const scale = canvas.height / maxValue;

    arr.forEach((value, index) => {
        // Set colors based on step state
        if (step.pivots?.includes(index)) {
            ctx.fillStyle = '#FF5722'; // Pivot color
        } else if (step.indexes?.includes(index)) {
            ctx.fillStyle = '#2196F3'; // Active element color
        } else {
            ctx.fillStyle = '#4CAF50'; // Default color
        }

        const barHeight = value * scale;
        ctx.fillRect(
            index * barWidth,
            canvas.height - barHeight,
            barWidth - 1,
            barHeight
        );

        // Add pointer indicators
        if (step.pointers) {
            Object.entries(step.pointers).forEach(([name, ptrIndex]) => {
                if (index === ptrIndex) {
                    ctx.fillStyle = '#FFC107';
                    ctx.font = '12px Arial';
                    ctx.fillText(name.toUpperCase(), index * barWidth + 5, canvas.height - 5);
                }
            });
        }
    });
}


function toggleView() {
    if (array.length > 10) return;
    useGraphView = !useGraphView;
    arrayVisual.style.display = useGraphView ? 'none' : 'block';
    canvas.style.display = useGraphView ? 'block' : 'none';
    if (useGraphView) drawGraph(array);
}

function startSorting() {
    if (sortInProgress) return;
    
    // Validate input
    const input = arrayInput.value.split(',').map(Number).filter(n => !isNaN(n));
    if (input.length === 0) {
        alert('Please enter valid numbers!');
        return;
    }
    
    array = input.slice(0, 10);
    arrayInput.value = array.join(',');
    
    // Setup view
    useGraphView = array.length > 10;
    viewBtn.disabled = array.length > 10;
    arrayVisual.style.display = array.length <= 10 ? 'block' : 'none';
    canvas.style.display = useGraphView ? 'block' : 'none';
    arrayVisual.innerHTML = '';
    
    // Initialize sorting
    sortGenerator = dualPivotQuickSort([...array]);
    isPaused = false;
    sortInProgress = true;
    startTime = performance.now();
    timerElement.textContent = 'Time: 0ms';
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    processSortStep();
}

function processSortStep() {
    if (isPaused || !sortGenerator) return;

    const { value: step, done } = sortGenerator.next();
    
    if (done) {
        sortInProgress = false;
        timerElement.textContent = `Time: ${(performance.now() - startTime).toFixed(2)}ms`;
        return;
    }

    // Update visualization
    if (array.length <= 10 && !useGraphView) {
        updateArrayVisualization(step);
    } else {
        drawGraph(step.arr);
    }

    // Update timer
    timerElement.textContent = `Time: ${(performance.now() - startTime).toFixed(2)}ms`;

    // Continue animation
    animationFrameId = setTimeout(() => {
        requestAnimationFrame(processSortStep);
    }, delay);
}

function pauseResume() {
    if (!sortInProgress) return;
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
    if (!isPaused) processSortStep();
}

function generateRandomArray() {
    const size = Math.floor(Math.random() * 10) + 3; // 3-12 elements
    array = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
    arrayInput.value = array.join(',');
    reset();
}

function reset() {
    sortInProgress = false;
    isPaused = true;
    clearTimeout(animationFrameId);
    
    // Reset visualization
    arrayVisual.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    timerElement.textContent = 'Time: 0ms';

    // Handle current array
    const input = arrayInput.value.split(',').map(Number).filter(n => !isNaN(n));
    array = input.slice(0, 10);
    
    if (array.length > 0) {
        if (array.length <= 10) {
            arrayVisual.style.display = 'block';
            canvas.style.display = 'none';
            arrayVisual.innerHTML = `<div class="array-step">Initial array: [${array.join(', ')}]</div>`;
        } else {
            arrayVisual.style.display = 'none';
            canvas.style.display = 'block';
            drawGraph(array);
        }
    }
}

// Initial setup
reset();