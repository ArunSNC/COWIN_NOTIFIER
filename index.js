let oldVal = undefined;

const got = require('got');
const nodemailer = require('nodemailer');
const usersData = require('./users_data.json');

const cron = require('node-cron');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
let transporter = nodemailer.createTransport({
            service:'gmail',
            pool: true,
            maxConnections: 10,
            auth: {
               user: 'BroadcastAlert@gmail.com',
               pass: 'Arun@1997'
            },
            debug: false,
            logger: true
});

let mailSend =  async (toUser, data) => {

    let mailOptions = {
    from: 'BroadcastAlert@gmail.com',
    to : toUser,
    subject: 'Covid Vaccine Slots Available',
    html: data
    };

    await transporter.sendMail(mailOptions);
}


let fetchAvailableVaccine = async (city_id) => {
    let data;
    let today = new Date();
    let date = today.toJSON().slice(0, 10);
    let nDate = date.slice(8, 10) + '-' 
    + date.slice(5, 7) + '-' 
    + date.slice(0, 4);

    return (async () => {
        try {
            const response = await got('https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=' + city_id + '&date=' + nDate);
            data = response.body;
            return JSON.parse(data);
        } catch (error) {
            data = error.response.body;
            console.log(data);
        }
    })()

}

let sortData = (data, age, dose) => {
    let arrData =[];
    for(let result of data){
        for(let res of result.sessions){
            if(res.available_capacity){
                if(res.available_capacity_dose1 && (dose == 1)){
                    if((res.min_age_limit == 45) && (age == 45)) {
                      console.log("Vaccine 1st dose available for 45+ at: ", result.name + ' == ' + res.available_capacity_dose1);
                      arrData.push(result);
                    }
                    else if((res.min_age_limit == 18) && (age == 18)){
                      console.log("Vaccine 1st dose available for 18+ at: ", result.name + ' == ' + res.available_capacity_dose1);
                      arrData.push(result);
    
                    }
                }
                else if(res.available_capacity_dose2  && (dose == 2)){
                    if((res.min_age_limit == 45) && (age == 45)) {
                        console.log("Vaccine 2nd dose available for 45+ at: ", result.name + ' == ' + res.available_capacity_dose2);
                        arrData.push(result);
                      }
                      else if((res.min_age_limit == 18) && (age == 18)){
                        console.log("Vaccine 2nd dose available for 18+ at: ", result.name + ' == ' + res.available_capacity_dose2);
                        arrData.push(result);
                      }
                }
            }
        }
    }
    return arrData;
}

let sendMailToUsers = async (result, index) =>{
    let msg = `<b>Hello,<br>Vaccination 1st dose available for 18+ at :  </b><br>`;
    let msg_ext = '';
    result.forEach(res => {
        let msgData = `<br><b>Vaccination Center : ${res.name} <br>Address: ${res.address}<br>State: ${res.state_name}<br>Pincode: ${res.pincode}</b><br>`;
        msg_ext = msg_ext + msgData;
    });
    console.log(usersData.entities[index].cityName);
    for(let j = 0 ; j < usersData.entities[index].users.above18.length ; j++){
        mailSend(usersData.entities[index].users.above18[j], msg + msg_ext).catch(err =>{
            console.error(err);
        });
    }
}


cron.schedule('*/30 * * * * *', () => {
    console.log("Restarting every 30 seconds");
    let age = [18, 45];
    let dose = [1,2];
    for (let i=0 ; i < usersData.entities.length ; i++){
        console.log(i);
        fetchAvailableVaccine(usersData.entities[i].cityID).then((data)=> {
            if(data){
                let result1 = sortData(data.centers, age[0], dose[0]);
                // let result2 = sortData(data.centers, age[1], dose[0]);
                // let result3 = sortData(data.centers, age[0], dose[1]);
                // let result4 = sortData(data.centers, age[1], dose[1]);
                if((oldVal == undefined) && result1.length){
                    oldVal = result1.length;
                    sendMailToUsers(result1, i).then((response) => {
                        console.log('Mail Sent');
                    });
                }else if(oldVal < result1.length){
                    oldVal = result1.length;
                    sendMailToUsers(result1, i).then((response) => {
                        console.log('Mail Sent');
                    });
                }else{
                    if(oldVal == undefined){
                        console.log('Slots not available at: ', usersData.entities[i].cityName);
                    }
                    else{
                        console.log('data remains same: ', usersData.entities[i].cityName);
                    }
                }
            }else{
                console.log('Unable to fetch data');
            }
        });
    }
});
