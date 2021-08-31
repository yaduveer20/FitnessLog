'use strict';

const elemLogo = document.querySelector('.logo');
const elemWorkouts = document.querySelector('.workouts');
const elemWork = document.querySelector('.work');
const elemType = document.querySelector('.work-input-type');
const elemDistance = document.querySelector('.work-input-distance');
const elemDuration = document.querySelector('.work-input-duration');
const elemCadence = document.querySelector('.work-input-cadence');
const elemElevation = document.querySelector('.work-input-elevation');
const contCadence = document.querySelector('.cadence');
const contElevation = document.querySelector('.elevation');

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


//workout class
class Workout{
    constructor(coords,distance,duration){
        this.coords = coords;
        this.duration = duration;
        this.distance = distance;
        this._createID();
        this._createDescription();
    }

    _createID(){
        this.id = Date.now();
    }

    _createDate(){
        this.date = new Date();
    }

    _createDescription(){
        const content = elemType.value === 'running' ? '🏃 Running' : (elemType.value === 'cycling' ? '🚴 Cycling' : '⛰️ Trekking');
        const dateObj = new Date();
        const date = `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
        this.description = `${content} on ${date}`;
    }

}

//running class
class Running extends Workout{
    type = 'running';
    constructor(coords,distance,duration,cadence){
        super(coords,distance,duration);
        this.cadence = cadence;
        this.calcPace();
        this._createID();
    }

    calcPace(){
        this.pace = this.duration / this.distance;
        this.pace = this.pace.toFixed(1);
        return this.pace;
    }
}

//cycling class
class Cycling extends Workout{
    type = 'cycling';
    constructor(coords,distance,duration,elevation){
        super(coords,distance,duration);
        this.elevation = elevation;
        this.calcSpeed();
    }

    calcSpeed(){
        this.speed = this.distance / (this.duration / 60);
        this.speed = this.speed.toFixed(1);
        return this.speed;
    }
}


//trekking class
class Trekking extends Workout{
    type = 'trekking';
    constructor(coords,distance,duration,cadence){
        super(coords,distance,duration);
        this.elevation = cadence;
        this.calcPace();
    }

    calcPace(){
        this.pace = this.duration / this.distance;
        this.pace = this.pace.toFixed(1);
        return this.pace;
    }
}



//main application launcher class
class App{

    #map;
    #mapEvent;
    #workouts = [];

    constructor(){
        this._init();

        this._getLocalStorage();

        //event listener of submit form
        elemWork.addEventListener('submit', this._submitWorkout.bind(this));
        
        //event listener for cycling and trekking to change cadence to trekking
        elemType.addEventListener('click',this._toggleElevationCadence.bind(this));

        //map moves to the coordinates of clicked workout
        elemWorkouts.addEventListener('click', this._moveToMarker.bind(this));

        //reset workouts on clicking logo button
        elemLogo.addEventListener('click', this._removeLocalStorage);
    
    }

    //get coordinates and loads map - geolocation api
    _init(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), 
                err=>alert('Unable to fetch your location.'));
        }
    }

    _loadMap(position){
        const {latitude,longitude} = position.coords;
            
        const coordinates = `https://www.google.com/maps/search/google+maps/@${latitude},${longitude}`;
        const coords = [latitude,longitude];
        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //map events listener
        this.#map.on('click',mapE=>{
            this.#mapEvent = mapE;
            elemWork.classList.remove('hidden');
            elemDistance.focus();
        });

        this.#workouts.forEach(workout=>{
            this.#renderMarker(workout);
        });
    }

    #newWorkout(){
        const validInputs = (...inputs)=>{
            return inputs.every(value=> Number.isFinite(value));
        };

        const allPositive = (...inputs)=>{
            return inputs.every(value=>value >=0);
        };

        const distance = +elemDistance.value;
        const duration = +elemDuration.value;
        const cadence = +elemCadence.value;
        const elevation = +elemElevation.value;

        const {lat,lng} = this.#mapEvent.latlng;

        const type = elemType.value;
        
        let workout;

        if(type === 'running'){
            
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence)){
                alert('Invalid inputs, positive numbers only.');
            }
            else{
                workout = new Running([lat,lng],distance,duration,cadence);
            }
        }
        else{
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration)){
                alert('Invalid inputs, numbers only.');
            }
            else{
                workout = type === 'cycling' ? new Cycling([lat,lng],distance,duration,elevation) : new Trekking([lat,lng],distance,duration,elevation);
            }
        }

        if(workout){
            this.#workouts.push(workout);
            this.#renderMarker(workout);
            this.#renderWorkout(workout);
        }
    }


    _submitWorkout(event){
        event.preventDefault();
        
        this.#newWorkout();
        this.#clearData();
        elemWork.classList.add('hidden');

        this._setLocalStorage();
    }

    //map will move to the marker on clicking on the workout on sidebar
    _moveToMarker(event){
        const currentWorkout = event.target.closest('.workout');
        if(!currentWorkout) return;
        
        const workout = this.#workouts.find(item=> item.id === +currentWorkout.dataset.id);
        
        this.#map.setView(workout.coords,14,{
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    #renderMarker(workout){
        // const content = elemType.value === 'running' ? '🏃 Running' : (elemType.value === 'cycling' ? '🚴 Cycling' : '⛰️ Trekking');
        // const dateObj = new Date();
        // const date = `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.description}`).openPopup();
    }

    //display and log workout on the sidebar
    #renderWorkout(workout){
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">🏃‍♂️</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running'){
            html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            </li>`;
        }
        else if(workout.type === 'cycling'){

            html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>`
        }
        else{
            html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>`
        }

        elemWork.insertAdjacentHTML('afterend',html);

    }

    //clear work form datafields
    #clearData(){
        elemType.value = 'running';
        elemDistance.value = elemDuration.value = elemCadence.value = elemElevation.value = null;
    }

    //change to elevation gain
    #changeToElevation(){
        contElevation.classList.remove('work-col-hidden');
        contCadence.classList.add('work-col-hidden');
    }

    //change to Cadence
    #changeToCadence(){
        contCadence.classList.remove('work-col-hidden');
        contElevation.classList.add('work-col-hidden');
    }

    //change elevation to cadence and vice-versa
    _toggleElevationCadence(){
        elemType.value === 'running' ? this.#changeToCadence(): this.#changeToElevation();
    }

    _setLocalStorage(){
        localStorage.setItem('workouts',JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const localData = localStorage.getItem('workouts');
        
        if(!localData) return;
        
        const localWorkouts = JSON.parse(localData);

        this.#workouts = localWorkouts;

        localWorkouts.forEach(workout=>{
            this.#renderWorkout(workout);
        });

    }

    _removeLocalStorage(){
        const permission = prompt('Delete all workouts?');
        if(permission === 'yes')
        localStorage.removeItem('workouts');
    }

}

const app = new App();