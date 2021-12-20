import {useRef, useState, useEffect, useCallback} from 'react';
import {useForm, Controller} from 'react-hook-form';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {useLocation, useNavigate} from "react-router-dom";

import './Form.css';
import {Button, Input} from "reactstrap";
import BellIcon from './assets/bells.png';
import CheckIcon from './assets/check-lg.svg';
import Selector from "./Selector";
import {validate} from "uuid";

const SHEET_ID = process.env.REACT_APP_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const S3_BUCKET = process.env.REACT_APP_S3_BUCKET;
const REGION = process.env.REACT_APP_REGION;
const ACCESS_KEY = process.env.REACT_APP_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.REACT_APP_SECRET_ACCESS_KEY;


const TIMESLOTS_TABLE = {day1: 1358113787, day2: 985358221};
const RESPONSE_TABLE = {day1: 883456226, day2: 1241199622};

const days = {
  day1: 'Day 1: 12月25日（六）',
  day2: 'Day 2: 12月26日（日）',
};

const answerOptions = [
  {label: '是 Yes', value: true},　
  {label: '否 No', value: false},
];

const infoHeaders = ['接收資訊', '已填寫健康申報'];

function Form(props) {
  const carouselRef = useRef(null);
  const [width, setWidth] = useState(window.innerWidth * 0.9);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(['claim', 'summary']);
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState({});
  const [status, setStatus] = useState('fetching');
  const [appliedWorkshop, setAppliedWorkshop] = useState([]);

  const { handleSubmit, control, getValues, register, unregister, formState: {errors}, watch, reset } = useForm();
  const location = useLocation();
  const navigate = useNavigate();

  const doc = new GoogleSpreadsheet(SHEET_ID);

  useEffect(() => {
    setWidth(carouselRef.current.offsetWidth);
  }, [carouselRef]);

  useEffect(async () => {
    const {date, id} = location.state;
    setStatus('fetching');
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsById[RESPONSE_TABLE[date]];
    const rows = await sheet.getRows({limit: 300});

    const hash = new Map();
    rows.forEach((row) => hash.set(row.id, row));
    const row = hash.get(id);
    if (!row) {
      setStatus('notFound');
    } else {
      const workshopHeaders = Object.keys(row).filter((header) => !infoHeaders.includes(header) && (row[header] === 'TRUE' || row[header] === 'DUPLICATED'));
      setAppliedWorkshop(workshopHeaders);
      setRow(row)
      setStatus('done');
    }
  }, []);


  const onSubmit = useCallback(async (data) => {
    const {declare, otherSymptoms, ...answers} = data;
    let yes = false;
    Object.keys(answers).forEach((key) => {
      if (answers[key] && answers[key].includes(true)) {
        yes = true;
      }
    });
    if (yes || otherSymptoms) {
      window.alert('健康申報表未能提交，請聯絡工作人員。');
      return;
    }

    row['已填寫健康申報'] = true;
    row['出席日期'] = (new Date()).toLocaleString("en-US");
    await row.save();


    setPage(page+1);
  }, [row, page]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="app formPage">
        <div className="carousel" ref={carouselRef}>
          {
            status === 'fetching' ?
              <div>
                <img className={'loading spinner'} src={BellIcon} />
              </div> :
              status === 'notFound' ?
                <div>
                  <div className={'header'}>{`找不到登記資料`}</div>
                </div> :
                <div className={'content'} style={{ marginLeft: -width * page}}>
                  {/*Page 1*/}
                  <div className={'page'} style={{ minWidth: width }}>
                    <form id="claimForm" className="form" onSubmit={handleSubmit(onSubmit)}>
                      <div className={'header'}>{`健康申報`}</div>
                      <div>{`姓名：${row['姓名']}　電話：${row['電話']}`}</div>
                      <div className="form-group">
                        <div className={'header2'}>近期身體狀況</div>
                        <div className={'hints'}>Recent Body Condition</div>
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否有發燒的症狀?</div>
                        <div className={'hints'}>Do you have any of the following Fever?</div>
                        {
                          errors && errors.fever && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'fever'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否有咳嗽的症狀?</div>
                        <div className={'hints'}>Do you have any of the following Cough?</div>
                        {
                          errors && errors.cough && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'cough'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否有咽喉痛的症狀?</div>
                        <div className={'hints'}>Do you have any of the following Sore Throat?</div>
                        {
                          errors && errors.soreThroat && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'soreThroat'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否有其他症狀?</div>
                        <div className={'hints'}>Do you have any other symptoms?</div>
                        {
                          errors && errors.other && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'other'} required />
                      </div>
                      {
                        watch('other') && watch('other').includes(true) &&
                          <div className="form-group">
                            <div className={'header3'}>請註明</div>
                            <div className={'hints'}>Please specify</div>
                            {
                              errors && errors.otherSymptoms && <div className={'error'}>請填上</div>
                            }
                            <input id="otherSymptoms" name="otherSymptoms" type="text" {...register('otherSymptoms', {required: true, shouldUnregister: true})} />
                          </div>
                      }
                      <div className="form-group">
                        <div className={'header2'}>在過去14日內</div>
                        <div className={'hints'}>In the past 14 days</div>
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下曾否到訪香港以外地方？</div>
                        <div className={'hints'}>Did you travel outside Hong Kong?</div>
                        {
                          errors && errors.travel && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'travel'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否曾經或現在接受香港衛生署的強制檢疫或醫學監察安排？</div>
                        <div className={'hints'}>Have you ever been under compulsory quarantine or medical surveillance order by the Department of Health of Hong Kong?</div>
                        {
                          errors && errors.quarantine && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'quarantine'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否與 2019 冠狀病毐的碓診者及/或 疑似確診者曾有或現有密切接觸的人士＃?</div>
                        <div className={'hints'}>Have you ever been in close contact# with confirmed case (s) and/or probable case(s) of COVID-19 patient(s)?</div>
                        <div className={'hints'}># 指從(a) 疑似病例症狀出現前2天; 或(b)無症狀感染者標本採樣前2天開始，未採取有效防護與其有近距離接觸的人士。<br/># Refers to any person who has not taken effective protection and has been in close contact with (a) probable case(s) or confirmed case(s) 2 days before the symptoms onset; or (b) asymptomatic infected person(s) 2 days before the sampling.  </div>
                        {
                          errors && errors.contact && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'contact'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header3'}>閣下是否曾經或現在與正在接受家居檢疫的人士同住？</div>
                        <div className={'hints'}>Have you ever lived with any person under home quarantine?</div>
                        {
                          errors && errors.home && <div className={'error'}>請選擇</div>
                        }
                        <Selector options={answerOptions} control={control} name={'home'} required />
                      </div>
                      <div className="form-group">
                        <div className={'header2'}>聲明</div>
                        <div className={'hints'}>Declaration</div>
                        <div className={'hints'}>收集個人資料擊明：閣下須提供在此表格中收集的所有資料，以用於本校預防傅染病發生或傳播相關之工作。
                          所有資料只會在閣下同意或在《個人資料(私隱)條例》允許的情況下，向其他人士或機構作出披露。<br/>
                          Personal Information Collection Statement: Your supply of all information collected in this form is required for the purpose of the school prevention of the occurrence or spread of Infectious Diseases. The information will only be disclosed to other parties or authorities with your consent or where it is permitted under the Personal Data(Privacy)Ordinance.</div>
                      </div>
                      <div>所有資料將於30天後銷毀</div>
                      {
                        errors && errors.declare && <div className={'error'}>請選擇</div>
                      }
                      <Controller
                        control={control}
                        defaultValue={true}
                        render={({field: {onChange}}) =>
                          <div className={`check-box${watch('declare') ? ' active' : ''}`} onClick={() => onChange(!watch('declare'))}>
                            { watch('declare') && <img src={CheckIcon} /> }
                            <div className={'check-box-label'}>本人聲明以上申報內容全部屬實。<br/>I declare that all the above information is true.</div>
                          </div>
                        }
                        rules={{
                          required: (value) => value
                        }}
                        name={'declare'}
                      />
                    </form>
                  </div>
                  {/*Page summary*/}
                  <div className={'page'} style={{ minWidth: width }}>
                    <div className={'label'}>{`多謝參與`}</div>
                    {
                      appliedWorkshop.length > 0 &&
                        <div>你已報名的是日工作坊包括：</div>
                    }
                    {
                      appliedWorkshop.map((workshop, index) =>
                        <div className={'header2'} key={`applied_workshop_${index}`}>{workshop}</div>
                      )
                    }
                  </div>
                </div>
          }
        </div>
      {
        pages[page] === 'claim' &&
          <div className='bottom-buttons'>
            {
              status === 'notFound' ?
                <Button className="bottom-button" type={'button'} size={'lg'} color={'primary'} onClick={goBack}>
                  返回
                </Button> :
                status === 'done' ?
                <Button className="bottom-button" form={'claimForm'} type={'submit'} size={'lg'} color={'primary'}>
                  {
                    loading ?
                      <div><img className={'loading spinner'} src={BellIcon} /></div> :
                      '提交表格'
                  }
                </Button> : null
            }
          </div>
      }
      {
        pages[page] === 'summary' &&
        <div className='bottom-buttons'>
          {
            <Button className="bottom-button" type={'button'} size={'lg'} color={'primary'} onClick={goBack}>
              返回
            </Button>
          }
        </div>
      }
    </div>
  );
};

export default Form;
