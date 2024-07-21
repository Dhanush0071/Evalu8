function redirect(page) {
    fetch('/redirect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page: page })
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function logout(){
    sessionStorage.removeItem('faculty_info')
    sessionStorage.removeItem('faculty_id')
    redirect('login')
}

function formatDate(dateString) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(dateString);
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// EVENT LISTENER TO RENDER THE LATEX

document.addEventListener("DOMContentLoaded", function (){
    renderMathInElement(document.body, {
        delimiters: [
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
        ]
    });
});

let test_data = []

function updateTestData(data){
    test_data = data
}

function showTestResults(test_id){

    fetch('/fetch-evaluation-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_id: test_id })
    }).then(response => {
        return response.json(); 
    }).then(test_info => {

        test_info = test_info[0]

        document.getElementById('test-name').innerText = test_info['test_name']
        document.getElementById('test-overview-attendees').innerText = test_info['no_of_attendees']
        document.getElementById('test-overview-highest-score').innerText = test_info['highest_mark']
        document.getElementById('test-overview-lowest-score').innerText = test_info['least_mark']
        document.getElementById('test-overview-average-score').innerText = test_info['average_mark']

        fetch('/fetch-evaluated-test-papers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test_id: test_id })
        }).then(response => {
            return response.json(); 
        }).then(submissions => {
            
            updateTestData(submissions)

            document.getElementById('overview-container').style.display = 'flex';
            document.getElementById('questions-container').style.display = 'flex';
            document.getElementById('no-test-selected').style.display = 'none';

            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth' 
            });

            document.getElementById('no-of-questions').innerText = test_info['no_of_easy'] + test_info['no_of_medium'] + test_info['no_of_hard']
            document.getElementById('easy-quantity').innerText = test_info['no_of_easy']
            document.getElementById('medium-quantity').innerText = test_info['no_of_medium']
            document.getElementById('hard-quantity').innerText = test_info['no_of_hard']
            document.getElementById('easy-total-score').innerText = test_info['no_of_easy']*2
            document.getElementById('medium-total-score').innerText = test_info['no_of_medium']*3
            document.getElementById('hard-total-score').innerText = test_info['no_of_hard']*5
            document.getElementById('overview-total').innerText = `${test_info['no_of_easy']*2} + ${test_info['no_of_medium']*3} + ${test_info['no_of_hard']*5} = ${test_info['no_of_easy']*2 + test_info['no_of_medium']*3 + test_info['no_of_hard']*5}`
        })
    })
}

function evaluateTest(test_id){

    fetch('/fetch-test-details', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_id: test_id })
    }).then(response => {
        return response.json(); 
    }).then(test_info => {
        document.getElementById('test-name').innerText = test_info['test_name']
    })

    fetch('/fetch-test-submissions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_id: test_id })
    }).then(response => {
        return response.json(); 
    }).then(submissions => {
        test_data = submissions

        document.getElementById('overview-container').style.display = 'flex';
        document.getElementById('questions-container').style.display = 'flex';
        document.getElementById('no-test-selected').style.display = 'none';

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth' 
        });

        let questions_split = getQuestionSplit(test_data)

        document.getElementById('no-of-questions').innerText = questions_split['easy'] + questions_split['medium'] + questions_split['hard']
        document.getElementById('easy-quantity').innerText = questions_split['easy']
        document.getElementById('medium-quantity').innerText = questions_split['medium']
        document.getElementById('hard-quantity').innerText = questions_split['hard']
        document.getElementById('easy-total-score').innerText = questions_split['easy']*2
        document.getElementById('medium-total-score').innerText = questions_split['medium']*3
        document.getElementById('hard-total-score').innerText = questions_split['hard']*5
        document.getElementById('overview-total').innerText = `${questions_split['easy']*2} + ${questions_split['medium']*3} + ${questions_split['hard']*5} = ${((questions_split['easy']*2) + (questions_split['medium']*3) + (questions_split['hard']*5))}`

        let class_total_mark = 0
        let no_of_attendees = submissions.length
        let highest_mark = 0
        let least_mark = Infinity

        submissions.forEach(submission => {
            let total_marks = 0
            submission['exam_data'].forEach(question => {
                question['marks_obtained'] = returnMarks(question)
                total_marks += question['marks_obtained'][0]
            })
            submission['total_marks'] = total_marks
            if (total_marks > highest_mark) {highest_mark = total_marks}
            if (total_marks < least_mark) {least_mark = total_marks}
            class_total_mark += total_marks
        })

        let average_mark = class_total_mark/no_of_attendees
        average_mark = average_mark.toFixed(2)

        document.getElementById('test-overview-attendees').innerText = no_of_attendees
        document.getElementById('test-overview-highest-score').innerText = highest_mark
        document.getElementById('test-overview-lowest-score').innerText = least_mark
        document.getElementById('test-overview-average-score').innerText = average_mark

        let evaluation_data = {
            no_of_easy: questions_split['easy'],
            no_of_hard: questions_split['hard'],
            no_of_medium: questions_split['medium'],
            no_of_attendees: no_of_attendees,
            average_mark: average_mark,
            highest_mark: highest_mark,
            least_mark: least_mark
        }

        fetch('/mark-test-evaluated', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test_id: test_id, evaluation_data:evaluation_data, student_test_data: submissions })
        }).then(response => {
            return response.json(); 
        })
    })
}

function getQuestionSplit(questions){
    test_data = questions
    let split = {easy:0, medium:0, hard:0}

    let no_of_easy = 0 
    let no_of_medium = 0 
    let no_of_hard = 0 

    questions = questions[0]['exam_data']

    questions.forEach(question => {
        if (question.difficulty_tag === 'Easy'){ no_of_easy += 1}
        else if (question.difficulty_tag === 'Medium'){ no_of_medium += 1}
        else if (question.difficulty_tag === 'Hard'){ no_of_hard += 1}
    })

    split['easy'] = no_of_easy
    split['medium'] = no_of_medium
    split['hard'] = no_of_hard

    return split
}

function showStudentTest(){
    let student_id = document.getElementById('search-for-student').value
    let index = undefined

    let questions_container = document.getElementById('questions');
    questions_container.querySelectorAll('.question-data').forEach(question => {
        question.remove();
    });

    document.getElementById('no-student-selected').style.display = 'none'

    if (test_data.length === 0){
        document.getElementById('no-submissions-made').style.display = 'flex'
    } else {
        document.getElementById('no-submissions-made').style.display = 'none'
        
        test_data.forEach(submission => {
            if (submission['student_id'] === student_id){
                index = test_data.indexOf(submission)
            }
        })

        let sorted_test_data = [...test_data].sort((a, b) => b.total_marks - a.total_marks);
        let position = sorted_test_data.findIndex(submission => submission.student_id === student_id);

        document.getElementById('student-overview-student-id').innerText = test_data[index]['student_id']
        document.getElementById('student-overview-total-score').innerText = test_data[index]['total_marks']
        document.getElementById('student-overview-position').innerText = `${position+1}/${test_data.length}`

        let questions = test_data[index]['exam_data']

        let no_of_correct_answers = 0
        let no_of_answered_questions = 0

        questions.forEach(question => {
            if (question['submitted_answers'] !== 'None'){
                no_of_answered_questions += 1
            }

            if (question['marks_obtained'][0] != 0){
                no_of_correct_answers += 1
            }
        })

        document.getElementById('student-overview-questions-answered').innerText = no_of_answered_questions
        document.getElementById('student-overview-correct-answers').innerText = no_of_correct_answers

        questions.forEach(question => {
            if (question.question_type === 'Single correct' || question.question_type === 'Multi correct'){
                addMCQQuestion(questions, question);
            } else if (question.question_type === 'Fill in the blank' || question.question_type === 'Full function'){
                addCodingQuestion(questions, question)
            } 
        });
    }
}


function clearContents(){
    let questions_container = document.getElementById('questions');
    questions_container.querySelectorAll('.question-data').forEach(question => {
        question.remove();
    });

    document.getElementById('no-student-selected').style.display = 'flex'

    document.getElementById('student-overview-student-id').innerText = ''
    document.getElementById('student-overview-total-score').innerText = '' 
    document.getElementById('student-overview-position').innerText = ''
    document.getElementById('student-overview-questions-answered').innerText = ''
    document.getElementById('student-overview-correct-answers').innerText = ''

}


document.addEventListener('DOMContentLoaded', function(){

    let faculty_info = JSON.parse(sessionStorage.getItem('faculty_info'))
    let faculty_id = faculty_info['faculty_id']

    fetch('/get-faculty-tests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ faculty_id: faculty_id })
    })
    .then(response => {
        return response.json(); 
    })
    .then(faculty_tests => {
        let active_tests = faculty_tests['active']
        let upcoming_tests = faculty_tests['upcoming']
        let completed_tests = faculty_tests['expired']

        const active_tests_container = document.getElementById('active-tests')
        const upcoming_tests_container = document.getElementById('upcoming-tests')
        const completed_tests_container = document.getElementById('completed-tests')


        if (active_tests.length === 0){
            document.getElementById('no-active-tests').style.display = 'flex'
        } else {
            document.getElementById('no-active-tests').style.display = 'none'
            active_tests.forEach(test_id => {

                fetch('/fetch-test-details', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test_id: test_id})
                })
                .then(response => {
                    return response.json(); 
                })
                .then(test_details => {

                    let active_test_card = document.createElement('div')
                    active_test_card.className = 'test-card'

                    active_test_card.innerHTML = `
                    <h2 id="course-code">${test_details['course_id']}</h2>
                    <div id="others">
                        <h3>${test_details['test_name']}</h3>
                        <p>${test_details['batch'].replaceAll('_', ' ')}</p>
                        <div class="time">
                            <p>${formatDate(test_details['test_date'])}</p>
                            <p>${test_details['test_start_time']} - ${test_details['test_end_time']}</p>
                        </div>
                    </div>
                    `
                    active_tests_container.appendChild(active_test_card)
                });
            });
        }

        if (upcoming_tests.length === 0){
            document.getElementById('no-upcoming-tests').style.display = 'flex'
        } else {
            document.getElementById('no-upcoming-tests').style.display = 'none'

            upcoming_tests.forEach(test_id => {
                let upcoming_test_card = document.createElement('div')
                upcoming_test_card.className = 'test-card'

                fetch('/fetch-test-details', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test_id: test_id})
                })
                .then(response => {
                    return response.json(); 
                })
                .then(test_details => {
            
                    upcoming_test_card.innerHTML = `
                    <h2 id="course-code">${test_details['course_id']}</h2>
                    <div id="others">
                        <h3>${test_details['test_name']}</h3>
                        <p>${test_details['batch'].replaceAll('_', ' ')}</p>
                        <div class="time">
                            <p>${formatDate(test_details['test_date'])}</p>
                            <p>${test_details['test_start_time']} - ${test_details['test_end_time']}</p>
                        </div>
                    </div>
                    `
                    upcoming_tests_container.appendChild(upcoming_test_card)
                });
            });
        }

        if (completed_tests.length === 0){
            document.getElementById('no-completed-tests').style.display = 'flex'
        } else {
            document.getElementById('no-completed-tests').style.display = 'none'

            completed_tests.forEach(test_id => {

                let completed_test_card = document.createElement('div')
                completed_test_card.className = 'test-card'

                fetch('/fetch-test-details', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test_id: test_id})
                })
                .then(response => {
                    return response.json();
                })
                .then(test_details => {
                    if (evaluated_tests.includes(test_id)){
                        completed_test_card.innerHTML = `
                        <h3 id="course-code">${test_details['course_id']}</h3>
                        <div id="others">
                            <h3>${test_details['test_name']}</h3>
                            <p>${test_details['batch'].replaceAll('_', ' ')}</p>
                            <button class="evaluate-button" id="evaluation-done" onclick="showTestResults('${test_details['test_id']}')">Show results</button>
                        </div>
                        `
                    } else {
                        completed_test_card.innerHTML = `
                        <h3 id="course-code">${test_details['course_id']}</h3>
                        <div id="others">
                            <h3>${test_details['test_name']}</h3>
                            <p>${test_details['batch'].replaceAll('_', ' ')}</p>
                            <button class="evaluate-button" onclick="evaluateTest('${test_details['test_id']}')">Evaluate Test</button>
                        </div>
                        `
                    }

                    completed_tests_container.appendChild(completed_test_card)
                })
            })
        };
    })
})

let evaluated_tests = []

function updateEvaluatedTests(tests){
    evaluated_tests = tests
}

document.addEventListener('DOMContentLoaded', function() {
    fetch('/fetch-all-evaluated-tests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => {
        return response.json();
    })
    .then(evaluated_tests => {
        updateEvaluatedTests(evaluated_tests)
    })
})  

function returnMarks(question){

    let out_of = 0;

    if (question.difficulty_tag === 'Easy'){
        out_of = 2;
    } else if (question.difficulty_tag === 'Medium')  {
        out_of = 3;
    } else if (question.difficulty_tag === 'Hard') {
        out_of = 5;
    }

    let gained_marks = 0;

    if (question.question_type === 'Single correct' || question.question_type === 'Multi correct') {
        
        let correctAnswers = [];
        if (typeof question.correct_answer === 'string') {
            correctAnswers = question.correct_answer.split(',').map(Number);
        } else if (typeof question.correct_answer === 'number') {
            correctAnswers = question.correct_answer.toString().split(',').map(Number);
        } else {
            console.error('Error: correct_answer is not a string or number');
        }

        let submittedAnswers = question.submitted_answers.split(',').map(Number);

        if (question.question_type === 'Single correct') {
            if (submittedAnswers.length === 1 && correctAnswers.includes(submittedAnswers[0])) {
                gained_marks = out_of;
            }
        }

        else if (question.question_type === 'Multi correct') {
            if (correctAnswers.every(answer => submittedAnswers.includes(answer))) {
                gained_marks = out_of;
            }
        }
    }

    else if (question.question_type === 'Fill in the blank' || question.question_type === 'Full function') {
        gained_marks = out_of;
    }

    if (gained_marks === 0) {
        return [0, out_of];
    } else {
        return [gained_marks, out_of];
    }
}

function addMCQQuestion(questions, question) {

    let marks = question['marks_obtained']

    let single_question_div = document.getElementById("questions");

    let question_data_div = document.createElement('div');
    question_data_div.className = "question-data";
    let question_number = questions.indexOf(question) + 1;
    question_data_div.id = `Q-${question_number}`;

    let qtype = question['question_type'];
    let optionsHTML = '';

    function isChecked(optionNumber) {
        if (question['question_type'] === 'Single correct') {
            return question['correct_answer'] == optionNumber;
        } else if (question['question_type'] === 'Multi correct') {
            let submittedAnswers = question['submitted_answers'].split(',').map(Number);
            return submittedAnswers.includes(optionNumber);
        }
        return false;
    }

    if (qtype === 'Single correct') {
        optionsHTML =
            `<div class="options">
                <div class="option">
                    <input type="radio" id="question-${question_number}-option-1" name="options-for-question-${question_number}" ${isChecked(1) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-1">${question['option_1']}</label>
                </div>

                <div class="option">
                    <input type="radio" id="question-${question_number}-option-2" name="options-for-question-${question_number}" ${isChecked(2) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-2">${question['option_2']}</label>
                </div>

                <div class="option">
                    <input type="radio" id="question-${question_number}-option-3" name="options-for-question-${question_number}" ${isChecked(3) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-3">${question['option_3']}</label>
                </div>

                <div class="option">
                    <input type="radio" id="question-${question_number}-option-4" name="options-for-question-${question_number}" ${isChecked(4) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-4">${question['option_4']}</label>
                </div>
            </div>`;
    } else if (qtype === 'Multi correct') {
        optionsHTML =
            `<div class="options">
                <div class="option">
                    <input type="checkbox" id="question-${question_number}-option-1" name="options-for-question-${question_number}" ${isChecked(1) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-1">${question['option_1']}</label>
                </div>

                <div class="option">
                    <input type="checkbox" id="question-${question_number}-option-2" name="options-for-question-${question_number}" ${isChecked(2) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-2">${question['option_2']}</label>
                </div>

                <div class="option">
                    <input type="checkbox" id="question-${question_number}-option-3" name="options-for-question-${question_number}" ${isChecked(3) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-3">${question['option_3']}</label>
                </div>

                <div class="option">
                    <input type="checkbox" id="question-${question_number}-option-4" name="options-for-question-${question_number}" ${isChecked(4) ? 'checked' : ' '} disabled>
                    <label for="question-${question_number}-option-4">${question['option_4']}</label>
                </div>
            </div>`;
    }

    question_data_div.innerHTML =
        `<div id=question-and-mark>
            <div id="question-number-head">Question <span id="question-number">${question_number}</span> </div>
            <div id=mark>${marks[0]}/${marks[1]}</div>
        </div>
        <div class="question">
            ${question['question_text']}
        </div>
        ${optionsHTML}`;

    single_question_div.appendChild(question_data_div);
}


function addCodingQuestion(questions, question) {

    let marks = returnMarks(question)

    let single_question_div = document.getElementById("questions");

    let question_data_div = document.createElement('div');
    question_data_div.className = "question-data";

    let question_number = questions.indexOf(question) + 1;
    question_data_div.id = `Q-${question_number}`;

    question_data_div.innerHTML = 
    `
    <div id=question-and-mark>
        <div id="question-number-head">Question <span id="question-number">${question_number}</span> </div>
        <div id=mark>${marks[0]}/${marks[1]}</div>
    </div>

    <div class="question">
        ${question['question_text']}
    </div>

    <div class="replace-options">
        <div class="e8-code-container" id="e8-code-container-${questions.indexOf(question) + 1}">
            <p id="code-editor-head">EVALU8 CODE EDITOR &lt;/&gt;<span class="code-language" id="code-language-${questions.indexOf(question) + 1}"></span></p>
    
            <div class="evalu8-code-editor" id="evalu8-code-editor-${questions.indexOf(question) + 1}"></div>
        </div>

        <div class="logs-and-desc">
            <div class="logs" id="code-logs-${questions.indexOf(question) + 1}" placeholder="Logs of your program will be shown here">${question['submitted_answers']['code_logs']}</div>
            <div class="desc" id="code-desc-${questions.indexOf(question) + 1}" placeholder="Explain the logic of your program here...">${question['submitted_answers']['code_desc']}</div>
        </div>
    </div>
    `;
    
    single_question_div.appendChild(question_data_div);

    let code_lines = question['submitted_answers']['submitted_code'].split("\n");
    let code_language = question['language'];
    let code_type = question['question_type'];
    let code_container = document.getElementById(`e8-code-container-${questions.indexOf(question) + 1}`);
    let code_editor = document.getElementById(`evalu8-code-editor-${questions.indexOf(question) + 1}`);
    document.getElementById(`code-language-${questions.indexOf(question) + 1}`).innerText = code_language;

    for (let code_line_number = 0; code_line_number < code_lines.length; code_line_number++) {
        let line = code_lines[code_line_number];

        let single_line = document.createElement('div');
        single_line.className = "code-row";

        let code_number = document.createElement('p');
        code_number.className = "code-row-number";

        let code_line = document.createElement('code');
        code_line.className = "code-row-text";

        if (code_language === 'Matlab') {
            if (line.includes("%E8")) {
                line = line.replace("%E8", "%E8 % Add your code here");
                line_parts = line.replace(/ /g, '&nbsp;').split('%E8');
                code_line.innerHTML = `<p>${line_parts[0]}<span class="comment">${line_parts[1]}</span></p>`;
                code_line.contentEditable = true;

                if (code_type === 'Fill in the blank') {
                    code_line.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                        }
                    });
                }

                code_number.innerHTML = `<p>${code_line_number + 1}</p>`;
                code_number.style.justifyContent = 'flex-end';
            } else {
                code_line.innerHTML = `<p>${line.replace(/ /g, '&nbsp;')}</p>`;
                code_line.readOnly = true;
                
                code_number.innerHTML = `<i id="lock-icon" class="fa-solid fa-lock"></i> ${code_line_number + 1}`;
            }
        } else if (code_language === 'Python') {
            if (line.includes("#E8")) {
                line = line.replace("#E8", "#E8 # Add your code here");
                line_parts = line.replace(/ /g, '&nbsp;').split('#E8');
                code_line.innerHTML = `<p>${line_parts[0]}<span class="comment">${line_parts[1]}</span></p>`;
                code_line.contentEditable = true;

                if (code_type === 'Fill in the blank') {
                    code_line.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                        }
                    });
                }

                code_number.innerHTML = `<p>${code_line_number + 1}</p>`;
                code_number.style.justifyContent = 'flex-end';
            } else {
                code_line.innerHTML = `<p>${line.replace(/ /g, '&nbsp;')}</p>`;
                code_line.readOnly = true;
                
                code_number.innerHTML = `<i id="lock-icon" class="fa-solid fa-lock"></i> ${code_line_number + 1}`;
            }
        }

        single_line.appendChild(code_number);
        single_line.appendChild(code_line);
        code_editor.appendChild(single_line);
    }
}