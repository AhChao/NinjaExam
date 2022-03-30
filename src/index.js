let pageData = {
    courseData : [],
    trainingData : [],
    examData : [],
    initialDataByFiles : function(){
        fetch("./data/Course.json").then(response => response.json()).then(json => {this.courseData = json; pageViewHandler.initSidebarCourseData(); });
        fetch("./data/Exam.json").then(response => response.json()).then(json => {this.examData = json; examHandler.initExamBySelectedCourseId(); });
        fetch("./data/Training.json").then(response => response.json()).then(json => {this.trainingData = json; pageViewHandler.loadCourseDataWithNowSelectedCourse(); });
    }
};
let pageViewHandler = {
    sideBarElement : document.getElementById("courseSideBar"),
    courseTitleElement : document.getElementById("contentTitle"),
    courseTrainingLink : document.getElementById("trainingLink"),
    courseTrainingDescription : document.getElementById("trainingDescription"),
    questionDescriptionElement : document.getElementById("questionDescription"),
    answerSelectionsElement : document.getElementById("answerSelections"),
    questionsPageElement : document.getElementById("questionsPage"),
    selectedCourseId : 1,
    initSidebarCourseData : function(){
        this.sideBarElement.innerHTML = "";
        let sideBarInnerHTML = "";
        let course;
        let isCourseReady;
        for(let i in pageData.courseData)
        {
            course = pageData.courseData[i];
            isCourseReady = course.IncludeExam == 'TRUE' || course.IncludeTraining == 'TRUE';
            sideBarInnerHTML += "<span class='course-item "+ (isCourseReady ? " " : " not-ready-course " ) + " " + (this.selectedCourseId == course.CourseId ? " selected-course " : " ") + "' onclick='pageInteract.clickCourseItem(this.id)' id=course"+course.CourseId+">" + course.CourseId + ". " + course.CourseName + "</span><br/>";
        }
        this.sideBarElement.innerHTML = sideBarInnerHTML;
    },
    loadCourseDataWithNowSelectedCourse : function(){
        let course = pageData.courseData.filter(x=>x.CourseId == this.selectedCourseId)[0];
        let training = pageData.trainingData.length != 0 ? pageData.trainingData.filter(x=>x.CourseId == this.selectedCourseId)[0] : {TrainingLink:"",TrainingDescription:""}; 
        this.courseTitleElement.innerHTML = course.CourseId + ". " + course.CourseName;
        this.courseTrainingLink.href = training.TrainingLink;
        this.courseTrainingDescription.innerHTML = training.TrainingDescription;
    },
    loadQuestionOnView : function(questionDescription,answerSelections,selectedOption){
        this.questionDescriptionElement.innerHTML = questionDescription;
        this.answerSelectionsElement.innerHTML = "";
        let answers = answerSelections.split("\n");
        for(let i in answers)
        {
            let answer = answers[i];
            this.answerSelectionsElement.innerHTML += "<span class='question-option'><input type='checkbox' "+ (selectedOption == Number(i)+1 ? "checked" : "") +" id='option"+(Number(i)+1)+"'/>" + answer + "</span><br/>"
        }
        this.updateQuestionsPage();
    },
    updateQuestionsPage : function(){
        this.questionsPageElement.innerHTML = (Number(examHandler.nowQuestionQueueId)+1) + " / " + examHandler.totalQuestionCount;
    }
}

let pageInteract = {
    profileAreaExpand : false,
    initialPage : function(){
        pageData.initialDataByFiles();
    },
    clickProfile : function(){
        this.profileAreaExpand = !this.profileAreaExpand;
    },
    clickCourseItem : function(courseId){
        var elems = document.querySelectorAll(".selected-course");
        [].forEach.call(elems, function(el) {
            el.classList.remove("selected-course");
        });
        pageViewHandler.selectedCourseId = courseId.split("course")[1];
        pageViewHandler.loadCourseDataWithNowSelectedCourse();
        document.getElementById("course"+pageViewHandler.selectedCourseId).classList += " selected-course";
        examHandler.initExamBySelectedCourseId();
    }
}

let examHandler = {
    nowQuestionQueueId : 0,
    nowQuestionAnswerOptionCount : 0,
    isQuestionOrderByRandom : false,
    totalQuestionCount : 0,
    questionQueue : [],
    answerQueue : [],
    nextButtonElement : document.getElementById("nextButton"),
    previousButtonElement : document.getElementById("previousButton"),
    initExamBySelectedCourseId : function(){  
        this.nowQuestionQueueId = 0;
        this.totalQuestionCount = pageData.courseData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId)[0].QuestionCount;
        this.isQuestionOrderByRandom = pageData.courseData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId)[0].IsQuestionOrderByRandom;
        let questionIds = pageData.examData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId).map(function(question) {
            return Number(question['QuestionId']);
          });;
        if(this.isQuestionOrderByRandom)
        {    
            this.questionQueue = questionIds.sort(() => 0.5 - Math.random());
        }
        else
        {
            this.questionQueue = questionIds.sort(function(a, b) {return a - b;});
        }
        this.questionQueue = this.questionQueue.slice(0,this.totalQuestionCount);
        this.answerQueue = Array.apply(null, {length: this.totalQuestionCount}).map(Number.call, function(){return 0;});
        this.loadQuestion(this.nowQuestionQueueId);  
    },
    loadQuestion : function(nowQuestionQueueId){
        let question = pageData.examData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId && x.QuestionId == this.questionQueue[nowQuestionQueueId])[0];
        let questionDescription = (Number(nowQuestionQueueId) + 1) + ". " + question.QuestionDescription;
        let answerSelections = question.AnswerSelections;
        this.nowQuestionQueueId = nowQuestionQueueId;
        this.previousButtonElement.disabled = this.nowQuestionQueueId - 1 < 0;
        this.nextButtonElement.disabled = Number(this.nowQuestionQueueId) + 2 > this.totalQuestionCount;
        this.nowQuestionAnswerOptionCount = answerSelections.split("\n").length;
        pageViewHandler.loadQuestionOnView(questionDescription, answerSelections, this.answerQueue[this.nowQuestionQueueId]);  
    },
    nextQuestion : function(){
        this.saveNowAnswer();
        this.nowQuestionQueueId += 1;
        this.loadQuestion(this.nowQuestionQueueId);
    },
    previousQuestion : function(){
        this.saveNowAnswer();
        this.nowQuestionQueueId -= 1;
        this.loadQuestion(this.nowQuestionQueueId);
    },
    saveNowAnswer : function(){
        for(var i=1; i <= this.nowQuestionAnswerOptionCount; i++)
        {
            if(document.getElementById("option"+i).checked)
            {
                this.answerQueue[this.nowQuestionQueueId] = i;   
            }
        }
    },
    submitExam : function(){
        this.saveNowAnswer();
        if(this.answerQueue.filter(x=>x == 0).length > 1)
        {
            if (!confirm('You still have some questiones not answer yet, do you want to submit the exam anyway?')) return;
        }
        let correctCount = 0;
        let examQuestionSet = pageData.examData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId);
        console.log(this.answerQueue,examQuestionSet);
        for(let i in examQuestionSet)
        {                
            if(this.answerQueue[i] == examQuestionSet[i].CorrectAnswerNumber)
                correctCount++;
        }
        let score = (correctCount / this.totalQuestionCount) * 100;
        let courseName = pageData.courseData.filter(x=>x.CourseId == pageViewHandler.selectedCourseId)[0].CourseName;
        alert('You got ' + score + ' points in the ' + courseName + ' exam!( The full mark is 100 )');
    }
}

pageInteract.initialPage();