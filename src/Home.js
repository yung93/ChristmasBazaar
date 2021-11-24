import {useRef, useState, useEffect, useCallback} from 'react';
import {useForm, Controller} from 'react-hook-form';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { v1 as uuid, validate } from 'uuid';
import QrReader from 'react-qr-reader';
import { useNavigate } from "react-router-dom";


import './Home.css';
import Selector from "./Selector";
import BellIcon from './assets/bells.png';
import {Button} from "reactstrap";

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const S3_BUCKET = process.env.REACT_APP_S3_BUCKET;
const REGION = process.env.REACT_APP_REGION;
const ACCESS_KEY = process.env.REACT_APP_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.REACT_APP_SECRET_ACCESS_KEY;


const RESPONSE_TABLE = {day1: 883456226, day2: 1241199622};

const today = (new Date()).getDate() < 26 ? 'day1' : 'day2';

const days = {
  day1: 'Day 1',
  day2: 'Day 2',
};

const dateOptions = [
  {label: days.day1, value: 'day1'},　
  {label: days.day2, value: 'day2'},
]

function App() {
  const onSubmitWorkshop = useCallback(async(data) => {
    // setLoading(true);
    // const id = uuid();
    // setId(id);
    // const infoData = {
    //   'id': id,
    //   '登記日期': (new Date()).toLocaleString("en-US"),
    //   '姓名': info.name,
    //   '電話': info.phone,
    //   '所屬群體': info.belongsTo,
    //   '學生姓名': info.studentName,
    //   '教會名稱': info.churchName,
    //   '其他教會名稱': info.otherChurch,
    //   '親友姓名': info.acquaintanceName,
    //   '親友所屬群體': info.acquaintanceBelongsTo,
    //   '接收資訊': info.promotion,
    // };
    //
    // const extraData = {
    //   '出席日期': undefined,
    //   '已填寫健康申報': undefined,
    // }
    //
    // await doc.useServiceAccountAuth({
    //   client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    //   private_key: GOOGLE_PRIVATE_KEY,
    // });
    // await doc.loadInfo();
    // const promises = dates.map(async (day) => {
    //   const sheet = doc.sheetsById[RESPONSE_TABLE[day]];
    //   const row = {...infoData, ...data[day], ...extraData};
    //   try {
    //     await sheet.loadHeaderRow()
    //   }
    //   catch {
    //     await sheet.setHeaderRow(Object.keys(row));
    //   } finally {
    //     return await sheet.addRow(row);
    //   }
    // });
    // await Promise.all(promises);
    // await handleSendEmail(id);
    // handleNext();
    // setLoading(false);
  }, []);

  const { handleSubmit, register, formState: {errors}, setError, setValue, control, reset, clearErrors } = useForm({
    defaultValues: {
      date: [today],
    }
  });
  const [loading, setLoading] = useState(false);
  const doc = new GoogleSpreadsheet(SHEET_ID);
  const navigate = useNavigate();

  const onSubmit = useCallback(async ({date, id}) => {
    navigate('form', {
      state: {
        date: date[0],
        id: id,
      },
    });
  }, [navigate])

  const handleError = useCallback((err) => {
    setError('id', {type: 'scan', message: err.message});
    console.log(err);
  }, [setError]);

  const handleScan = useCallback((data) => {
    if (data) {
      clearErrors();
      setValue('id', data);
    }
  }, [reset, setValue]);

  return (
    <div className="app home">
      <div className={'content'}>
        <div className={'page'}>
          <form id="idForm" className="form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <Selector control={control} name={'date'} options={dateOptions} requird />
              {
                errors.date && <div className={'error'}>請選擇日期</div>
              }
            </div>
            <div className="form-group">
              <input id="id" name="id" type="text" {...register('id', {required: '請輸入ID', validate: {
                  invalid: (value) => validate(value) || 'ID不正確'
                }})} />
              {
                errors.id && <div className={'error'}>{errors.id.message}</div>
              }
            </div>
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </form>
        </div>
      </div>
      <div className='bottom-buttons'>
        <Button className="bottom-button" form={'idForm'} type={'submit'} size={'lg'} color={'primary'}>
          {
            loading ?
              <div><img className={'loading spinner'} src={BellIcon} /></div> :
              '下一步'
          }
        </Button>
      </div>
    </div>
  );
};

export default App;
